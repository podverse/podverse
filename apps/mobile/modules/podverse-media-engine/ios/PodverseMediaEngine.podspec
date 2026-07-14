Pod::Spec.new do |s|
  s.name           = 'PodverseMediaEngine'
  s.version        = '1.0.0'
  s.summary        = 'First-party Podverse media engine (single shared AVPlayer, lock screen, car foundation).'
  s.description    = 'Native playback transport for the Podverse next-generation mobile app. Owns the single process-wide AVPlayer for phone, lock screen, and future CarPlay now-playing. See ../README.md.'
  s.author         = 'Podverse'
  s.homepage       = 'https://podverse.fm'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
