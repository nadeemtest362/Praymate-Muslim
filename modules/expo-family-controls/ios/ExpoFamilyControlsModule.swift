import ExpoModulesCore
import FamilyControls
import ManagedSettings

public class ExpoFamilyControlsModule: Module {
  private let authorizationManager = FamilyControlsAuthorizationManager()
  private let appBlockingManager = AppBlockingManager()
  private let sharedDataManager = SharedDataManager()
  
  public func definition() -> ModuleDefinition {
    Name("ExpoFamilyControls")
    
    Events("onShieldAction", "onAuthorizationChange")
    
    // Platform availability
    Function("isSupported") { () -> Bool in
      if #available(iOS 16.0, *) {
        return true
      } else {
        return false
      }
    }
    
    // Authorization
    AsyncFunction("requestAuthorization") { () -> Bool in
      guard #available(iOS 16.0, *) else {
        return false
      }
      
      return await authorizationManager.requestAuthorization()
    }
    
    AsyncFunction("checkAuthorizationStatus") { () -> String in
      guard #available(iOS 16.0, *) else {
        return "notDetermined"
      }
      
      return authorizationManager.checkAuthorizationStatus().rawValue
    }
    
    // App Selection
    AsyncFunction("selectAppsToBlock") { () -> Void in
      guard #available(iOS 16.0, *) else {
        throw NSError(domain: "ExpoFamilyControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "Family Controls requires iOS 16.0+"])
      }
      
      try await appBlockingManager.selectAppsToBlock()
    }
    
    AsyncFunction("getBlockedApps") { () -> [[String: Any]] in
      guard #available(iOS 16.0, *) else {
        return []
      }
      
      return appBlockingManager.getBlockedApps()
    }
    
    AsyncFunction("clearBlockedApps") { () -> Void in
      guard #available(iOS 16.0, *) else {
        return
      }
      
      appBlockingManager.clearBlockedApps()
    }
    
    // Blocking Control
    AsyncFunction("enablePraylock") { (schedule: [String: Any]) -> Void in
      guard #available(iOS 16.0, *) else {
        throw NSError(domain: "ExpoFamilyControls", code: 1, userInfo: [NSLocalizedDescriptionKey: "Family Controls requires iOS 16.0+"])
      }
      
      try appBlockingManager.enablePraylock(schedule: schedule)
    }
    
    AsyncFunction("disablePraylock") { () -> Void in
      guard #available(iOS 16.0, *) else {
        return
      }
      
      appBlockingManager.disablePraylock()
    }
    
    AsyncFunction("isPraylockEnabled") { () -> Bool in
      guard #available(iOS 16.0, *) else {
        return false
      }
      
      return sharedDataManager.isPraylockEnabled()
    }
    
    // Prayer Completion
    AsyncFunction("markPrayerCompleted") { (period: String) -> Void in
      guard #available(iOS 16.0, *) else {
        return
      }
      
      sharedDataManager.markPrayerCompleted(period: period)
      
      // If this was the active blocking period, disable the restrictions
      if appBlockingManager.isActiveBlockingPeriod(period: period) {
        appBlockingManager.disablePraylock()
      }
    }
    
    // Emergency Unlock
    AsyncFunction("performEmergencyUnlock") { (appBundleId: String) -> Void in
      guard #available(iOS 16.0, *) else {
        return
      }
      
      // This would require special handling in the shield extension
      sharedDataManager.recordEmergencyUnlock(appBundleId: appBundleId)
    }
  }
}
