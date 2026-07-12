import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/login_screen.dart';
import 'auth_messages.dart';

String? _pendingAuthMessage;

void storeAuthMessage(String message) {
  _pendingAuthMessage = message;
}

String? consumeAuthMessage() {
  final message = _pendingAuthMessage;
  _pendingAuthMessage = null;
  return message;
}

/// Returns true if the user is authenticated.
/// If not, shows a SnackBar, navigates to [LoginScreen], and returns false.
bool requireAuth(BuildContext context, {String? message}) {
  final auth = context.read<AuthProvider>();
  if (auth.user != null) return true;

  final msg = message ?? AuthMessages.defaultMessage;
  storeAuthMessage(msg);

  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFFDC2626),
      behavior: SnackBarBehavior.floating,
    ),
  );

  Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => const LoginScreen(returnOnSuccess: true)),
  );

  return false;
}
