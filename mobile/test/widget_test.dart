// Smoke test: the app boots and shows a loading indicator before auth resolves.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:thrivehub_mobile/main.dart';

void main() {
  testWidgets('App boots into a loading state', (WidgetTester tester) async {
    await tester.pumpWidget(const ThriveHubApp());
    // AuthProvider.init() runs asynchronously; the first frame shows a spinner.
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
