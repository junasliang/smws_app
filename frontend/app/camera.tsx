import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";

import {
  isAppleOcrAvailable,
  recognizeText,
} from "../modules/expo-apple-ocr";
import {
  ApiError,
  getWhisky,
} from "../services/api";
import { extractBestWhiskyQuery } from "../utils/ocr";

const SCAN_INTERVAL_MS = 1000;

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="返回上一頁"
      onPress={() => router.back()}
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.backButtonText}>‹ 上一頁</Text>
    </Pressable>
  );
}

export default function CameraScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [matched, setMatched] = useState(false);
  const [message, setMessage] = useState("將 SMWS 酒款編號放入框內");

  const requestInFlightRef = useRef(false);
  const matchedRef = useRef(false);
  const ocrAvailable = isAppleOcrAvailable();

  const scanFrame = useCallback(async () => {
    if (
      !cameraRef.current ||
      !cameraReady ||
      requestInFlightRef.current ||
      matchedRef.current
    ) {
      return;
    }

    requestInFlightRef.current = true;
    setIsScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        shutterSound: false,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        return;
      }

      // Keep OCR fast by reducing the captured image before running Vision.
      const context = ImageManipulator.ImageManipulator.manipulate(photo.uri);
      context.resize({
        width: 1280,
        height: null,
      });

      const imageRef = await context.renderAsync();
      const resizedImage = await imageRef.saveAsync({
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Apple Vision OCR runs locally on the iPhone. No image is uploaded.
      const lines = await recognizeText(resizedImage.uri);
      const candidate = extractBestWhiskyQuery(lines);

      if (!candidate) {
        setMessage("掃描中，請將桶號對準框內");
        return;
      }

      // For the automatic camera flow, only auto-open a bottle when a cask
      // number is recognized. This avoids routing on random label text.
      if (candidate.source !== "cask_no") {
        setMessage("已辨識到文字，請將 CASK NO 對準框內");
        return;
      }

      try {
        const whisky = await getWhisky(candidate.query);

        matchedRef.current = true;
        setMatched(true);
        setMessage(`找到 ${whisky.cask_no}`);

        router.replace({
          pathname: "/whisky/[caskNo]",
          params: {
            caskNo: whisky.cask_no,
          },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setMessage(`辨識到 ${candidate.query}，資料庫中沒有此酒款`);
          return;
        }

        throw error;
      }
    } catch (error) {
      console.warn("Native OCR scan failed:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "掃描暫時失敗，正在重試",
      );
    } finally {
      requestInFlightRef.current = false;
      setIsScanning(false);
    }
  }, [cameraReady]);

  useEffect(() => {
    if (
      !ocrAvailable ||
      !permission?.granted ||
      !cameraReady ||
      matched
    ) {
      return;
    }

    void scanFrame();

    const interval = setInterval(() => {
      void scanFrame();
    }, SCAN_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [
    ocrAvailable,
    permission?.granted,
    cameraReady,
    matched,
    scanFrame,
  ]);

  if (!ocrAvailable) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.permissionTitle}>需要 Development Build</Text>
        <Text style={styles.permissionText}>
          Apple Vision OCR 是 iOS Native Module，Expo Go 不包含這個模組。
        </Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <BackButton />
        <ActivityIndicator />
        <Text style={styles.centerText}>正在確認相機權限</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <BackButton />
        <Text style={styles.permissionTitle}>需要相機權限</Text>
        <Text style={styles.permissionText}>使用相機掃描 SMWS 酒款編號。</Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => {
            void requestPermission();
          }}
        >
          <Text style={styles.buttonText}>允許使用相機</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        active={!matched}
        animateShutter={false}
        onCameraReady={() => {
          setCameraReady(true);
        }}
      />

      <BackButton />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.scanBox}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>

        <View style={styles.status}>
          {isScanning && (
            <ActivityIndicator color="#ffffff" style={styles.loader} />
          )}
          <Text style={styles.statusText}>{message}</Text>
        </View>

        <Text style={styles.helpText}>
          將「SOCIETY CASK NO: 53.515」對準框內
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000000",
  },
  centerText: {
    marginTop: 12,
    color: "#ffffff",
  },
  permissionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  permissionText: {
    color: "#cccccc",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    position: "absolute",
    top: 54,
    left: 18,
    zIndex: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    width: "84%",
    height: 180,
    position: "relative",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 35,
    height: 35,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#ffffff",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 35,
    height: 35,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#ffffff",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 35,
    height: 35,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#ffffff",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 35,
    height: 35,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#ffffff",
  },
  status: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  loader: {
    marginRight: 8,
  },
  statusText: {
    flexShrink: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  helpText: {
    position: "absolute",
    bottom: 70,
    color: "#ffffff",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  pressed: {
    opacity: 0.7,
  },
});
