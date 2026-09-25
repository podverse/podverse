import AVFoundation
import ExpoModulesCore
import Foundation

/// `basicAuth` argument of `load` / `loadAndStart`, as the JS bridge serializes it.
struct MediaBasicAuthRecord: Record {
  @Field var username: String = ""
  @Field var password: String = ""
  @Field var scopeHost: String = ""
  @Field var scopeMatch: String = "exact"
  @Field var allowInsecure: Bool = false

  /// `nil` when the record is incomplete, so the load proceeds without credentials.
  func toScopedBasicAuth() -> ScopedBasicAuth? {
    let host = normalizeScopeHost(scopeHost)
    guard !username.isEmpty, !host.isEmpty else { return nil }
    return ScopedBasicAuth(
      username: username,
      password: password,
      scopeHost: host,
      matchSubdomains: scopeMatch == "domain",
      allowInsecure: allowInsecure)
  }
}

/// Add-by-RSS feed credentials plus the hosts that may receive them.
///
/// `CustomStringConvertible` keeps the password out of any log line that interpolates this value.
struct ScopedBasicAuth: CustomStringConvertible {
  let username: String
  let password: String
  let scopeHost: String
  let matchSubdomains: Bool
  let allowInsecure: Bool

  var description: String { "ScopedBasicAuth(scopeHost: \(scopeHost))" }

  /// True when a challenge from `host` over `scheme` may be answered with these credentials.
  func allows(scheme: String, host: String) -> Bool {
    let normalizedScheme = scheme.lowercased()
    guard normalizedScheme == "https" || (allowInsecure && normalizedScheme == "http") else {
      return false
    }
    let normalizedHost = normalizeScopeHost(host)
    if normalizedHost == scopeHost { return true }
    return matchSubdomains && normalizedHost.hasSuffix(".\(scopeHost)")
  }
}

/// Answers a host's Basic challenge for one protected asset, and only when that host is in scope.
///
/// Credentials never go in the URL or on a request up front — AVFoundation asks here each time a
/// host (the enclosure, or any host a redirect lands on) answers 401, and the challenge names that
/// host, so a redirect off the feed's domain gets no credentials. A repeat challenge for the same
/// protection space means the credentials were rejected; continuing without a credential lets the
/// 401 fail the item. Non-password methods (server trust, client certificates) keep the system's
/// default handling.
final class PodverseMediaAuthLoaderDelegate: NSObject, AVAssetResourceLoaderDelegate {
  private let auth: ScopedBasicAuth

  init(auth: ScopedBasicAuth) {
    self.auth = auth
  }

  func resourceLoader(
    _ resourceLoader: AVAssetResourceLoader,
    shouldWaitForResponseTo authenticationChallenge: URLAuthenticationChallenge
  ) -> Bool {
    let space = authenticationChallenge.protectionSpace
    let method = space.authenticationMethod
    guard method == NSURLAuthenticationMethodHTTPBasic || method == NSURLAuthenticationMethodDefault
    else {
      return false
    }
    guard let sender = authenticationChallenge.sender else { return false }

    let inScope = auth.allows(scheme: space.protocol ?? "", host: space.host)
    guard !space.isProxy(), authenticationChallenge.previousFailureCount == 0, inScope else {
      sender.continueWithoutCredential(for: authenticationChallenge)
      return true
    }

    let credential = URLCredential(
      user: auth.username, password: auth.password, persistence: .none)
    sender.use(credential, for: authenticationChallenge)
    return true
  }
}

private func normalizeScopeHost(_ host: String) -> String {
  var value = host.trimmingCharacters(in: .whitespaces).lowercased()
  if value.hasPrefix("[") { value.removeFirst() }
  if value.hasSuffix("]") { value.removeLast() }
  if value.hasSuffix(".") { value.removeLast() }
  return value
}
