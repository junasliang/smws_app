import { requireOptionalNativeModule } from "expo";

type ExpoAppleOcrNativeModule = {
  recognizeText(imageUri: string): Promise<string[]>;
};

const nativeModule = requireOptionalNativeModule(
  "ExpoAppleOcr",
) as ExpoAppleOcrNativeModule | null;

export function isAppleOcrAvailable(): boolean {
  return nativeModule !== null;
}

export async function recognizeText(imageUri: string): Promise<string[]> {
  if (!nativeModule) {
    throw new Error(
      "Apple Vision OCR is unavailable. Install and open the iOS Development Build instead of Expo Go.",
    );
  }

  return nativeModule.recognizeText(imageUri);
}
