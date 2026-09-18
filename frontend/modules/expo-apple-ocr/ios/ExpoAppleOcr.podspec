Pod::Spec.new do |s|
  s.name = 'ExpoAppleOcr'
  s.version = '0.1.0'
  s.summary = 'On-device Apple Vision OCR for the SMWS app.'
  s.description = 'A local Expo module that exposes Apple Vision text recognition to React Native.'
  s.license = { :type => 'MIT' }
  s.author = { 'SMWS Search' => 'local' }
  s.homepage = 'https://docs.expo.dev/modules/'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '6.0'
  s.source = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
