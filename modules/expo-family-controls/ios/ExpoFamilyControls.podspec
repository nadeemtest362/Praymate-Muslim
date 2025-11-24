Pod::Spec.new do |s|
  s.name           = 'ExpoFamilyControls'
  s.version        = '1.0.0'
  s.summary        = 'A sample project summary'
  s.description    = 'A sample project description'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }
  
  # Family Controls frameworks (iOS 16.0+)
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'ManagedSettingsUI'
  s.weak_frameworks = 'FamilyControls', 'ManagedSettings', 'ManagedSettingsUI'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
