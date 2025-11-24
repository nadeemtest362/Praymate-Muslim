import Foundation
import FamilyControls
import ManagedSettings

@available(iOS 16.0, *)
class AppBlockingManager {
    private let store = ManagedSettingsStore()
    private let sharedDataManager = SharedDataManager()
    private var selectedApps = Set<ApplicationToken>()
    
    func selectAppsToBlock() async throws {
        // This will present the system UI for app selection
        // Note: In a real implementation, you'd need to handle this differently
        // as FamilyActivityPicker requires UIKit integration
        // For now, we'll just simulate the selection
        
        // In production, you would:
        // 1. Create a UIViewController that presents FamilyActivityPicker
        // 2. Handle the selection callback
        // 3. Store the selected apps
        
        // For this implementation, we'll assume apps are selected elsewhere
        // and just save them
        updateBlockedApps()
    }
    
    func getBlockedApps() -> [[String: Any]] {
        // Get stored bundle IDs from shared data
        let bundleIds = sharedDataManager.getBlockedApps()
        
        // Convert to dictionary format expected by JS
        return bundleIds.map { bundleId in
            return [
                "bundleId": bundleId,
                "displayName": getAppDisplayName(bundleId: bundleId),
                "icon": "" // Icon would require additional implementation
            ]
        }
    }
    
    func clearBlockedApps() {
        selectedApps.removeAll()
        sharedDataManager.saveBlockedApps([])
        
        // Clear restrictions
        store.clearAllSettings()
    }
    
    func enablePraylock(schedule: [String: Any]) throws {
        guard !selectedApps.isEmpty || !sharedDataManager.getBlockedApps().isEmpty else {
            throw NSError(
                domain: "ExpoFamilyControls",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "No apps selected to block"]
            )
        }
        
        // Save schedule
        sharedDataManager.saveBlockingSchedule(schedule)
        sharedDataManager.setPraylockEnabled(true)
        
        // Apply restrictions based on schedule
        applyRestrictionsForCurrentTime(schedule: schedule)
        
        // Set up monitoring for schedule changes
        setupScheduleMonitoring(schedule: schedule)
    }
    
    func disablePraylock() {
        sharedDataManager.setPraylockEnabled(false)
        
        // Remove all restrictions
        store.clearAllSettings()
    }
    
    func isActiveBlockingPeriod(period: String) -> Bool {
        guard let schedule = sharedDataManager.getBlockingSchedule(),
              let scheduleType = schedule["type"] as? String else {
            return false
        }
        
        let currentHour = Calendar.current.component(.hour, from: Date())
        
        switch period {
        case "morning":
            return (scheduleType == "morning" || scheduleType == "both") &&
                   currentHour >= 4 &&
                   !sharedDataManager.isPrayerCompletedToday(period: "morning")
        case "evening":
            return (scheduleType == "evening" || scheduleType == "both") &&
                   currentHour >= 16 &&
                   !sharedDataManager.isPrayerCompletedToday(period: "evening")
        default:
            return false
        }
    }
    
    private func updateBlockedApps() {
        // In a real implementation, this would get the actual selected apps
        // For now, we'll use a placeholder
        let bundleIds = selectedApps.compactMap { token in
            // Extract bundle ID from token (this is a simplified version)
            return "com.example.app"
        }
        
        sharedDataManager.saveBlockedApps(bundleIds)
    }
    
    private func applyRestrictionsForCurrentTime(schedule: [String: Any]) {
        guard let scheduleType = schedule["type"] as? String else { return }
        
        let currentHour = Calendar.current.component(.hour, from: Date())
        
        // Check morning window (4 AM until prayer completed)
        if (scheduleType == "morning" || scheduleType == "both") &&
           currentHour >= 4 &&
           !sharedDataManager.isPrayerCompletedToday(period: "morning") {
            applyRestrictions()
            return
        }
        
        // Check evening window (4 PM until prayer completed)
        if (scheduleType == "evening" || scheduleType == "both") &&
           currentHour >= 16 &&
           !sharedDataManager.isPrayerCompletedToday(period: "evening") {
            applyRestrictions()
            return
        }
        
        // Outside blocking windows or prayer completed
        store.clearAllSettings()
    }
    
    private func applyRestrictions() {
        // Apply the app restrictions
        store.shield.applicationCategories = .all()
        store.shield.applications = selectedApps
        
        // Optional: Add additional restrictions
        store.application.denyAppInstallation = true
        store.application.denyAppRemoval = true
    }
    
    private func setupScheduleMonitoring(schedule: [String: Any]) {
        // In a real implementation, this would set up:
        // 1. Timer to check at 4 AM and 4 PM
        // 2. Monitor for prayer completion
        // 3. Update restrictions accordingly
        
        // For now, we'll rely on the app checking periodically
    }
    
    private func getAppDisplayName(bundleId: String) -> String {
        // In a real implementation, this would look up the actual app name
        // For now, return a formatted version of the bundle ID
        return bundleId.components(separatedBy: ".").last?.capitalized ?? bundleId
    }
} 