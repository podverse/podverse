Pod::Spec.new do |s|
  s.name           = 'PodversePerfProbe'
  s.version        = '1.0.0'
  s.summary        = 'Dev/E2E UI-thread frame gap probe for Podverse mobile perf captures.'
  s.description    = 'CADisplayLink-based frame timing for the mobile perf harness. Active only when JS starts the probe.'
  s.author         = 'Podverse'
  s.homepage       = 'https://podverse.fm'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
