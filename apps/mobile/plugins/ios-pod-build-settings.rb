# @generated begin podverse-ios-pod-build-settings
# Build settings every pod target needs on Xcode 27.
#
# IPHONEOS_DEPLOYMENT_TARGET: Xcode's supported simulator range is 15.0-27.0, and podspecs may
# declare a lower value; xcodebuild fails those targets.
#
# SWIFT_ENABLE_EXPLICIT_MODULES: expo-sqlite publishes a header named sqlite3.h, which shadows the
# iOS SDK header of the same name. The explicit-module dependency scan binds that include to the
# SDK's SQLite3 module, so the emitted pcm command never carries the builtin modules the pod's own
# sqlite3.h pulls in, and the build fails with "module '_Builtin_stdarg' is needed but has not been
# provided". Implicit modules resolve the include the same way the compile does.
projects = [installer.pods_project]
projects.concat(installer.generated_projects) if installer.respond_to?(:generated_projects)
projects.compact.uniq.each do |project|
  configs = project.build_configurations + project.targets.flat_map(&:build_configurations)
  configs.each do |config|
    current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
    if current.nil? || current.to_s.empty? || current.to_f < 15.0
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
    end
    config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
  end
end
# @generated end podverse-ios-pod-build-settings
