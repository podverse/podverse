package expo.modules.podversemediaengine

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.Locale
import okhttp3.Authenticator
import okhttp3.Credentials
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/** `basicAuth` argument of `load` / `loadAndStart`, as the JS bridge serializes it. */
class MediaBasicAuthRecord : Record {
  @Field val username: String = ""
  @Field val password: String = ""
  @Field val scopeHost: String = ""
  @Field val scopeMatch: String = "exact"
  @Field val allowInsecure: Boolean = false

  /** `null` when the record is incomplete, so the load proceeds without credentials. */
  fun toScopedBasicAuth(): ScopedBasicAuth? {
    val host = normalizeScopeHost(scopeHost)
    if (username.isEmpty() || host.isEmpty()) {
      return null
    }
    return ScopedBasicAuth(
      username = username,
      password = password,
      scopeHost = host,
      matchSubdomains = scopeMatch == "domain",
      allowInsecure = allowInsecure,
    )
  }
}

/**
 * Add-by-RSS feed credentials plus the hosts that may receive them.
 *
 * Not a data class: the generated `toString` would print the password into any log line that
 * formats this value.
 */
class ScopedBasicAuth(
  val username: String,
  val password: String,
  private val scopeHost: String,
  private val matchSubdomains: Boolean,
  private val allowInsecure: Boolean,
) {
  /** True when a challenge from [host] over [scheme] may be answered with these credentials. */
  fun allows(scheme: String, host: String): Boolean {
    val normalizedScheme = scheme.lowercase(Locale.ROOT)
    if (normalizedScheme != "https" && !(allowInsecure && normalizedScheme == "http")) {
      return false
    }
    val normalizedHost = normalizeScopeHost(host)
    if (normalizedHost == scopeHost) {
      return true
    }
    return matchSubdomains && normalizedHost.endsWith(".$scopeHost")
  }

  override fun toString(): String = "ScopedBasicAuth(scopeHost=$scopeHost)"
}

/**
 * Answers a host's Basic challenge only when that host is in scope.
 *
 * Credentials are never attached up front. OkHttp removes `Authorization` whenever it follows a
 * redirect to a different host, port, or scheme, so a hop off the feed's domain arrives without
 * them and a 401 there reaches this check with the new host. A request that already carried
 * `Authorization` and still got 401 means the credentials were rejected; returning `null` ends the
 * retry and surfaces the 401 to the player.
 */
class ScopedBasicAuthenticator(private val auth: ScopedBasicAuth) : Authenticator {
  override fun authenticate(route: Route?, response: Response): Request? {
    val request = response.request
    if (request.header("Authorization") != null) {
      return null
    }
    if (response.challenges().none { it.scheme.equals("Basic", ignoreCase = true) }) {
      return null
    }
    if (!auth.allows(request.url.scheme, request.url.host)) {
      return null
    }
    return request
      .newBuilder()
      .header("Authorization", Credentials.basic(auth.username, auth.password, Charsets.UTF_8))
      .build()
  }
}

private fun normalizeScopeHost(host: String): String =
  host.trim().removePrefix("[").removeSuffix("]").removeSuffix(".").lowercase(Locale.ROOT)
