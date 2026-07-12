import 'package:flutter/material.dart';

/// ThriveHub brand palette — vibrant violet → fuchsia → rose.
/// Kept in sync with the web theme (web/src/index.css).
class AppColors {
  static const primary = Color(0xFF7C3AED); // violet-600
  static const secondary = Color(0xFFD946EF); // fuchsia-500
  static const accent = Color(0xFFF43F5E); // rose-500
  static const teal = Color(0xFF06B6D4); // cyan-500

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, secondary, accent],
  );

  static const softBackground = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFF5F3FF), Color(0xFFFDF2F8), Color(0xFFFFF1F2)],
  );
}
