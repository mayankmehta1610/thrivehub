import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/upload_limits.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService api = ApiService();
  Map<String, dynamic>? user;
  Map<String, dynamic>? config;
  bool loading = true;

  UploadLimits get uploadLimits => UploadLimits.fromConfig(config);
  UploadValidator get uploadValidator => UploadValidator.fromConfig(config);

  Future<void> init() async {
    await api.loadTokens();
    try {
      await api.wakeApi();
      config = await api.getConfig();
      user = await api.getMe();
    } catch (_) {
      user = null;
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(
    String email,
    String password, {
    void Function(String message)? onWakeStatus,
  }) async {
    await api.login(email, password, onWakeStatus: onWakeStatus);
    user = await api.getMe();
    notifyListeners();
  }

  Future<void> logout() async {
    await api.clearTokens();
    user = null;
    notifyListeners();
  }

  Future<void> refreshUser() async {
    user = await api.getMe();
    notifyListeners();
  }
}
