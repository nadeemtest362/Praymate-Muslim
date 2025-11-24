import Foundation

class SharedDataManager {
    private let appGroupId = "group.com.md90210.justpray"
    private let sharedDefaults: UserDefaults?
    
    // Keys for shared data
    private let praylockEnabledKey = "praylock_enabled"
    private let blockedAppsKey = "blocked_apps"
    private let morningPrayerCompletedKey = "morning_prayer_completed"
    private let eveningPrayerCompletedKey = "evening_prayer_completed"
    private let lastPrayerDateKey = "last_prayer_date"
    private let emergencyUnlocksKey = "emergency_unlocks_today"
    private let blockingScheduleKey = "blocking_schedule"
    
    init() {
        sharedDefaults = UserDefaults(suiteName: appGroupId)
    }
    
    func isPraylockEnabled() -> Bool {
        return sharedDefaults?.bool(forKey: praylockEnabledKey) ?? false
    }
    
    func setPraylockEnabled(_ enabled: Bool) {
        sharedDefaults?.set(enabled, forKey: praylockEnabledKey)
        sharedDefaults?.synchronize()
    }
    
    func saveBlockedApps(_ bundleIds: [String]) {
        sharedDefaults?.set(bundleIds, forKey: blockedAppsKey)
        sharedDefaults?.synchronize()
    }
    
    func getBlockedApps() -> [String] {
        return sharedDefaults?.stringArray(forKey: blockedAppsKey) ?? []
    }
    
    func saveBlockingSchedule(_ schedule: [String: Any]) {
        sharedDefaults?.set(schedule, forKey: blockingScheduleKey)
        sharedDefaults?.synchronize()
    }
    
    func getBlockingSchedule() -> [String: Any]? {
        return sharedDefaults?.dictionary(forKey: blockingScheduleKey)
    }
    
    func markPrayerCompleted(period: String) {
        let key = period == "morning" ? morningPrayerCompletedKey : eveningPrayerCompletedKey
        let today = dateString(from: Date())
        sharedDefaults?.set(today, forKey: key)
        sharedDefaults?.set(Date(), forKey: lastPrayerDateKey)
        sharedDefaults?.synchronize()
    }
    
    func isPrayerCompletedToday(period: String) -> Bool {
        let key = period == "morning" ? morningPrayerCompletedKey : eveningPrayerCompletedKey
        let completedDate = sharedDefaults?.string(forKey: key) ?? ""
        let today = dateString(from: Date())
        return completedDate == today
    }
    
    func recordEmergencyUnlock(appBundleId: String) {
        let today = dateString(from: Date())
        var unlocks = sharedDefaults?.dictionary(forKey: emergencyUnlocksKey) ?? [:]
        var todayUnlocks = unlocks[today] as? [String] ?? []
        todayUnlocks.append(appBundleId)
        unlocks[today] = todayUnlocks
        sharedDefaults?.set(unlocks, forKey: emergencyUnlocksKey)
        sharedDefaults?.synchronize()
    }
    
    func resetDailyData() {
        // Check if we need to reset for a new day
        let lastDate = sharedDefaults?.object(forKey: lastPrayerDateKey) as? Date ?? Date.distantPast
        let calendar = Calendar.current
        
        if !calendar.isDateInToday(lastDate) {
            // Reset daily completion flags
            sharedDefaults?.removeObject(forKey: morningPrayerCompletedKey)
            sharedDefaults?.removeObject(forKey: eveningPrayerCompletedKey)
            
            // Clean up old emergency unlocks
            cleanupOldEmergencyUnlocks()
        }
    }
    
    private func cleanupOldEmergencyUnlocks() {
        var unlocks = sharedDefaults?.dictionary(forKey: emergencyUnlocksKey) ?? [:]
        let today = dateString(from: Date())
        
        // Keep only today's unlocks
        unlocks = unlocks.filter { $0.key == today }
        
        sharedDefaults?.set(unlocks, forKey: emergencyUnlocksKey)
        sharedDefaults?.synchronize()
    }
    
    private func dateString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
} 