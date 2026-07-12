import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );

  String? _token;
  String? _refreshToken;

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

  Future<dynamic> get(String path, [Map<String, String>? params]) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: params);
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode == 401) return _refreshAndRetry(() => get(path, params));
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['detail'] ?? 'Request failed');
    return jsonDecode(res.body);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['detail'] ?? 'Request failed');
    return jsonDecode(res.body);
  }

  Future<dynamic> _refreshAndRetry(Future<dynamic> Function() retry) async {
    if (_refreshToken == null) throw Exception('Session expired');
    final res = await http.post(
      Uri.parse('$baseUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': _refreshToken}),
    );
    if (res.statusCode >= 400) {
      await clearTokens();
      throw Exception('Session expired');
    }
    final data = jsonDecode(res.body);
    await saveTokens(data['access_token'], data['refresh_token']);
    return retry();
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await post('/auth/login', {'email': email, 'password': password});
    await saveTokens(data['access_token'], data['refresh_token']);
    return data;
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> body) async {
    final data = await post('/auth/register', body);
    await saveTokens(data['access_token'], data['refresh_token']);
    return data;
  }

  Future<Map<String, dynamic>> getMe() => get('/auth/me');
  Future<Map<String, dynamic>> getConfig() => get('/config');
  Future<Map<String, dynamic>> getFeed({int page = 1}) => get('/feed', {'page': '$page', 'page_size': '20'});
  Future<Map<String, dynamic>> getCommunities({int page = 1, String? search}) =>
      get('/communities', {'page': '$page', 'page_size': '20', if (search != null) 'search': search});
  Future<Map<String, dynamic>> getEvents({int page = 1}) => get('/events', {'page': '$page', 'page_size': '20'});
  Future<Map<String, dynamic>> getNotifications({int page = 1}) =>
      get('/notifications', {'page': '$page', 'page_size': '20'});
  Future<Map<String, dynamic>> search(String q) => get('/search', {'q': q});
  Future<Map<String, dynamic>> createPost(String body, {String? imageUrl}) =>
      post('/posts', {'body': body, if (imageUrl != null) 'image_url': imageUrl});
  Future<void> reactPost(String postId) => post('/posts/$postId/reactions', {'reaction_type': 'like'});
}
