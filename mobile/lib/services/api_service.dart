import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/upload_limits.dart';

const networkErrorMessage =
    'Unable to reach the server. It may be waking up (free tier) — wait a moment and try again.';

class NetworkException implements Exception {
  final String message;
  NetworkException([this.message = networkErrorMessage]);
  @override
  String toString() => message;
}

class ApiException implements Exception {
  final String message;
  final int status;
  ApiException(this.message, this.status);
  @override
  String toString() => message;
}

class ApiService {
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );

  static const int _maxRetries = 6;

  String? _token;
  String? _refreshToken;

  static String get healthUrl {
    if (baseUrl.startsWith('http')) {
      return baseUrl.replaceAll(RegExp(r'/api/v1/?$'), '') + '/health';
    }
    return '/health';
  }

  int _backoffMs(int attempt) => min(1500 * pow(2, attempt).toInt(), 15000);

  bool _isNetworkError(Object e) =>
      e is http.ClientException || e is NetworkException;

  Future<http.Response> _fetchWithRetry(
    Future<http.Response> Function() request, {
    int retries = _maxRetries,
  }) async {
    Object? lastError;
    for (var attempt = 0; attempt < retries; attempt++) {
      try {
        return await request();
      } catch (e) {
        lastError = e;
        if (!_isNetworkError(e) || attempt == retries - 1) rethrow;
        await Future.delayed(Duration(milliseconds: _backoffMs(attempt)));
      }
    }
    throw lastError ?? NetworkException();
  }

  /// Ping GET /health until the API responds or [maxWait] elapses.
  Future<bool> wakeApi({
    Duration maxWait = const Duration(seconds: 60),
    void Function(String message)? onStatus,
  }) async {
    final deadline = DateTime.now().add(maxWait);
    var attempt = 0;

    while (DateTime.now().isBefore(deadline)) {
      attempt++;
      onStatus?.call('Waking up server...');
      try {
        final res = await http
            .get(Uri.parse(healthUrl))
            .timeout(const Duration(seconds: 10));
        if (res.statusCode == 200) return true;
      } catch (_) {}

      final remaining = deadline.difference(DateTime.now());
      if (remaining <= Duration.zero) break;
      final delay = Duration(milliseconds: _backoffMs(attempt - 1));
      await Future.delayed(remaining < delay ? remaining : delay);
    }
    return false;
  }

  Future<void> loadTokens() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('access_token');
    _refreshToken = prefs.getString('refresh_token');
  }

  Future<void> saveTokens(String access, String refresh) async {
    _token = access;
    _refreshToken = refresh;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', access);
    await prefs.setString('refresh_token', refresh);
  }

  Future<void> clearTokens() async {
    _token = null;
    _refreshToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  void _throwForResponse(http.Response res) {
    if (res.statusCode >= 400) {
      String message = 'Request failed';
      try {
        final body = jsonDecode(res.body);
        if (body is Map && body['detail'] != null) {
          message = body['detail'].toString();
        }
      } catch (_) {}
      throw ApiException(message, res.statusCode);
    }
  }

  Future<dynamic> get(String path, [Map<String, String>? params]) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: params);
    http.Response res;
    try {
      res = await _fetchWithRetry(() => http.get(uri, headers: _headers));
    } catch (e) {
      if (_isNetworkError(e)) throw NetworkException();
      rethrow;
    }
    if (res.statusCode == 401) return _refreshAndRetry(() => get(path, params));
    _throwForResponse(res);
    return jsonDecode(res.body);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    http.Response res;
    try {
      res = await _fetchWithRetry(
        () => http.post(
          Uri.parse('$baseUrl$path'),
          headers: _headers,
          body: jsonEncode(body),
        ),
      );
    } catch (e) {
      if (_isNetworkError(e)) throw NetworkException();
      rethrow;
    }
    _throwForResponse(res);
    return jsonDecode(res.body);
  }

  Future<dynamic> _refreshAndRetry(Future<dynamic> Function() retry) async {
    if (_refreshToken == null) throw ApiException('Session expired', 401);
    http.Response res;
    try {
      res = await _fetchWithRetry(
        () => http.post(
          Uri.parse('$baseUrl/auth/refresh'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'refresh_token': _refreshToken}),
        ),
      );
    } catch (e) {
      if (_isNetworkError(e)) throw NetworkException();
      rethrow;
    }
    if (res.statusCode >= 400) {
      await clearTokens();
      throw ApiException('Session expired', res.statusCode);
    }
    final data = jsonDecode(res.body);
    await saveTokens(data['access_token'], data['refresh_token']);
    return retry();
  }

  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    String? otp,
    void Function(String message)? onWakeStatus,
  }) async {
    final awake = await wakeApi(onStatus: onWakeStatus);
    if (!awake) throw NetworkException();

    final body = {'email': email, 'password': password};
    if (otp != null && otp.isNotEmpty) body['otp'] = otp;
    final data = await post('/auth/login', body);
    await saveTokens(data['access_token'], data['refresh_token']);
    return data;
  }

  // Two-factor auth
  Future<Map<String, dynamic>> get2faStatus() => _getMap('/auth/2fa/status');
  Future<Map<String, dynamic>> setup2fa() => _postMap('/auth/2fa/setup');
  Future<Map<String, dynamic>> enable2fa(String code) => _postMap('/auth/2fa/enable', {'code': code});
  Future<Map<String, dynamic>> disable2fa(String code) => _postMap('/auth/2fa/disable', {'code': code});

  // Connections (mutual request/accept)
  Future<void> requestConnection(String username) => post('/connections/request/$username', {});
  Future<List<dynamic>> getConnectionRequests() async => (await get('/connections/requests')) as List<dynamic>;
  Future<void> acceptConnection(String userId) => post('/connections/accept/$userId', {});
  Future<void> removeConnection(String userId) async {
    http.Response res;
    try {
      res = await _fetchWithRetry(() => http.delete(Uri.parse('$baseUrl/connections/$userId'), headers: _headers));
    } catch (e) {
      if (_isNetworkError(e)) throw NetworkException();
      rethrow;
    }
    if (res.statusCode == 401) { await _refreshAndRetry(() => removeConnection(userId)); return; }
    _throwForResponse(res);
  }

  // Group conversation + data privacy
  Future<Map<String, dynamic>> createGroupConversation(String title, List<String> ids) =>
      _postMap('/messages/conversations', {'type': 'group', 'title': title, 'participant_ids': ids});
  Future<Map<String, dynamic>> exportMyData() => _getMap('/me/export');
  Future<void> requestAccountDeletion() => post('/me/deletion-request', {});

  Future<Map<String, dynamic>> register(Map<String, dynamic> body) async {
    final awake = await wakeApi();
    if (!awake) throw NetworkException();

    final data = await post('/auth/register', body);
    await saveTokens(data['access_token'], data['refresh_token']);
    return data;
  }

  Future<dynamic> patch(String path, Map<String, dynamic> body) async {
    http.Response res;
    try {
      res = await _fetchWithRetry(
        () => http.patch(Uri.parse('$baseUrl$path'), headers: _headers, body: jsonEncode(body)),
      );
    } catch (e) {
      if (_isNetworkError(e)) throw NetworkException();
      rethrow;
    }
    if (res.statusCode == 401) return _refreshAndRetry(() => patch(path, body));
    _throwForResponse(res);
    return res.body.isEmpty ? null : jsonDecode(res.body);
  }

  // Typed helpers so callers get Future<Map<String, dynamic>> from the dynamic core.
  Future<Map<String, dynamic>> _getMap(String path, [Map<String, String>? params]) async =>
      (await get(path, params)) as Map<String, dynamic>;
  Future<Map<String, dynamic>> _postMap(String path, [Map<String, dynamic> body = const {}]) async =>
      (await post(path, body)) as Map<String, dynamic>;

  Future<Map<String, dynamic>> getMe() => _getMap('/auth/me');
  Future<Map<String, dynamic>> getConfig() => _getMap('/config');
  Future<Map<String, dynamic>> getFeed({int page = 1}) => _getMap('/feed', {'page': '$page', 'page_size': '20'});
  Future<Map<String, dynamic>> getCommunities({int page = 1, String? search}) =>
      _getMap('/communities', {'page': '$page', 'page_size': '20', if (search != null) 'search': search});
  Future<Map<String, dynamic>> getEvents({int page = 1}) => _getMap('/events', {'page': '$page', 'page_size': '20'});
  Future<Map<String, dynamic>> getEvent(String id) => _getMap('/events/$id');
  Future<void> registerEvent(String id) => post('/events/$id/register', {});
  Future<void> joinCommunity(String slug) => post('/communities/$slug/join', {});
  Future<Map<String, dynamic>> getNotifications({int page = 1}) =>
      _getMap('/notifications', {'page': '$page', 'page_size': '20'});
  Future<void> markNotificationRead(String id) => patch('/notifications/$id/read', {});
  Future<void> markAllNotificationsRead() => post('/notifications/read-all', {});
  Future<Map<String, dynamic>> search(String q, {String? entity}) =>
      _getMap('/search', {'q': q, if (entity != null) 'entity': entity});
  Future<Map<String, dynamic>> createPost(String body, {String? imageUrl}) =>
      _postMap('/posts', {'body': body, if (imageUrl != null) 'image_url': imageUrl});
  Future<void> reactPost(String postId) => post('/posts/$postId/reactions', {'reaction_type': 'like'});
  Future<Map<String, dynamic>> getPostComments(String postId) =>
      _getMap('/posts/$postId/comments', {'page_size': '50'});
  Future<Map<String, dynamic>> createComment(String postId, String body) =>
      _postMap('/posts/$postId/comments', {'body': body});

  Future<Map<String, dynamic>> getConversations({int page = 1}) =>
      _getMap('/messages/conversations', {'page': '$page', 'page_size': '50'});
  Future<Map<String, dynamic>> getMessages(String convId, {int page = 1}) =>
      _getMap('/messages/conversations/$convId/messages', {'page': '$page', 'page_size': '100'});
  Future<void> sendMessage(String convId, String body) =>
      post('/messages/conversations/$convId/messages', {'body': body});
  Future<Map<String, dynamic>> createConversation(String userId) =>
      _postMap('/messages/conversations', {'type': 'direct', 'participant_ids': [userId]});

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    http.Response res;
    try {
      res = await _fetchWithRetry(
        () => http.patch(
          Uri.parse('$baseUrl/profiles/me'),
          headers: _headers,
          body: jsonEncode(data),
        ),
      );
    } catch (e) {
      if (_isNetworkError(e)) throw NetworkException();
      rethrow;
    }
    if (res.statusCode == 401) {
      return await _refreshAndRetry(() => updateProfile(data));
    }
    _throwForResponse(res);
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> getSponsorships({String? placement}) =>
      _getMap('/sponsorships', {if (placement != null) 'placement': placement, 'page_size': '5'});
  Future<Map<String, dynamic>> getSubscriptionTiers() =>
      _getMap('/subscriptions/tiers', {'page_size': '10'});

  Future<Map<String, dynamic>> uploadMedia(
    List<int> bytes, {
    required String filename,
    required String contentType,
    UploadLimits? limits,
    String folder = 'media',
  }) async {
    final effectiveLimits = limits ?? UploadLimits();
    UploadValidator(effectiveLimits).validateOrThrow(
      contentType: contentType,
      sizeBytes: bytes.length,
    );

    final uri = Uri.parse('$baseUrl/media/upload').replace(queryParameters: {'folder': folder});
    final request = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $_token'
      ..files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));

    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode == 401) {
      return await _refreshAndRetry(() => uploadMedia(
            bytes,
            filename: filename,
            contentType: contentType,
            limits: limits,
            folder: folder,
          ));
    }
    if (res.statusCode >= 400) {
      final body = jsonDecode(res.body);
      final detail = body is Map ? body['detail'] : null;
      throw ApiException(detail?.toString() ?? 'Upload failed', res.statusCode);
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
