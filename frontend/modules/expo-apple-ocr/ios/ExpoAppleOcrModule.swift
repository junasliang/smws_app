import ExpoModulesCore
import Vision

private enum AppleOcrError: LocalizedError {
  case invalidImageUri

  var errorDescription: String? {
    switch self {
    case .invalidImageUri:
      return "Apple OCR expected a local file URI."
    }
  }
}

public class ExpoAppleOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoAppleOcr")

    AsyncFunction("recognizeText") { (imageUri: String) throws -> [String] in
      guard let imageUrl = URL(string: imageUri), imageUrl.isFileURL else {
        throw AppleOcrError.invalidImageUri
      }

      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false
      request.recognitionLanguages = ["en-US"]
      request.minimumTextHeight = 0.012

      let handler = VNImageRequestHandler(url: imageUrl, options: [:])
      try handler.perform([request])

      return (request.results ?? []).compactMap { observation in
        observation.topCandidates(1).first?.string
      }
    }
  }
}
