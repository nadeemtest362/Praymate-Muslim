import Foundation
import FamilyControls

@available(iOS 16.0, *)
class FamilyControlsAuthorizationManager {
    private let authorizationCenter = AuthorizationCenter.shared
    
    enum AuthorizationStatus: String {
        case notDetermined = "notDetermined"
        case denied = "denied"
        case approved = "approved"
    }
    
    func requestAuthorization() async -> Bool {
        do {
            try await authorizationCenter.requestAuthorization(for: .individual)
            return authorizationCenter.authorizationStatus == .approved
        } catch {
            print("Failed to request Family Controls authorization: \(error)")
            return false
        }
    }
    
    func checkAuthorizationStatus() -> AuthorizationStatus {
        switch authorizationCenter.authorizationStatus {
        case .notDetermined:
            return .notDetermined
        case .denied:
            return .denied
        case .approved:
            return .approved
        @unknown default:
            return .notDetermined
        }
    }
} 