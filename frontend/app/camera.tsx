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

import { scanWhiskyImage } from "../services/api";

const SCAN_INTERVAL_MS = 1000;

export default function CameraScreen() {
  const cameraRef =
    useRef<CameraView | null>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [cameraReady, setCameraReady] =
    useState(false);

  const [isScanning, setIsScanning] =
    useState(false);

  const [matched, setMatched] =
    useState(false);

  const [message, setMessage] =
    useState("將 SMWS 酒款編號放入框內");

  /**
   * Prevent overlapping scan requests.
   *
   * OCR request A hasn't finished
   * → don't send request B.
   */
  const requestInFlightRef =
    useRef(false);

  /**
   * Once matched, completely stop scanning.
   */
  const matchedRef =
    useRef(false);

  const scanFrame = useCallback(
    async () => {
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
        /**
         * Capture current camera frame.
         *
         * quality is deliberately not too high because
         * OCR only needs readable label text.
         */
        const photo =
          await cameraRef.current.takePictureAsync({
            quality: 0.5,
            shutterSound: false,
            skipProcessing: false,
          });

        if (!photo?.uri) {
          return;
        }

        /**
         * Resize before uploading.
         *
         * Original iPhone photos can be several thousand
         * pixels wide. 1280 px is enough for label OCR
         * and significantly reduces network traffic.
         */
        const context =
          ImageManipulator.ImageManipulator.manipulate(
            photo.uri,
          );

        context.resize({
          width: 1280,
          height: null,
        });

        const imageRef =
          await context.renderAsync();

        const resizedImage =
          await imageRef.saveAsync({
            compress: 0.6,
            format:
              ImageManipulator.SaveFormat.JPEG,
          });

        /**
         * Send image to FastAPI:
         *
         * POST /api/v1/scan
         */
        const result =
          await scanWhiskyImage(
            resizedImage.uri,
          );

        /**
         * Whisky found.
         */
        if (
          result.matched &&
          result.cask_no
        ) {
          matchedRef.current = true;

          setMatched(true);
          setMessage(
            `找到 ${result.cask_no}`,
          );

          router.replace({
            pathname:
              "/whisky/[caskNo]",
            params: {
              caskNo: result.cask_no,
            },
          });

          return;
        }

        /**
         * OCR detected something cask-like,
         * but it wasn't found in DB.
         */
        if (
          result.status === "not_found" &&
          result.detected_candidates.length >
            0
        ) {
          setMessage(
            `辨識到 ${result.detected_candidates[0]}，繼續掃描`,
          );

          return;
        }

        /**
         * Nothing useful detected.
         */
        setMessage(
          "掃描中，請將桶號對準框內",
        );
      } catch (error) {
        console.warn(
          "Scan request failed:",
          error,
        );

        setMessage(
          "掃描暫時失敗，正在重試",
        );
      } finally {
        requestInFlightRef.current =
          false;

        setIsScanning(false);
      }
    },
    [cameraReady],
  );

  /**
   * Automatic scan loop.
   *
   * We intentionally use an interval + in-flight lock.
   *
   * If OCR takes longer than one second,
   * the next interval simply does nothing.
   */
  useEffect(() => {
    if (
      !permission?.granted ||
      !cameraReady ||
      matched
    ) {
      return;
    }

    /**
     * Don't make the user wait one full interval
     * for the first scan.
     */
    void scanFrame();

    const interval = setInterval(
      () => {
        void scanFrame();
      },
      SCAN_INTERVAL_MS,
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    permission?.granted,
    cameraReady,
    matched,
    scanFrame,
  ]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />

        <Text style={styles.centerText}>
          正在確認相機權限
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionTitle}>
          需要相機權限
        </Text>

        <Text style={styles.permissionText}>
          使用相機掃描 SMWS 酒款編號。
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => {
            void requestPermission();
          }}
        >
          <Text style={styles.buttonText}>
            允許使用相機
          </Text>
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

      <View
        pointerEvents="none"
        style={styles.overlay}
      >
        <View style={styles.scanBox}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>

        <View style={styles.status}>
          {isScanning && (
            <ActivityIndicator
              color="#ffffff"
              style={styles.loader}
            />
          )}

          <Text style={styles.statusText}>
            {message}
          </Text>
        </View>

        <Text style={styles.helpText}>
          將「SOCIETY CASK NO: 53.515」
          對準框內
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
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

      paddingHorizontal: 14,
      paddingVertical: 10,

      borderRadius: 10,

      backgroundColor:
        "rgba(0, 0, 0, 0.7)",
    },

    loader: {
      marginRight: 8,
    },

    statusText: {
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

      backgroundColor:
        "rgba(0, 0, 0, 0.55)",
    },
  });