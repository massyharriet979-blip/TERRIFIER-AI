// Inside your main loop, where you get user input
String userInput = scanner.nextLine();

// Check for bug features
if (userInput.equalsIgnoreCase("bugs")) {
    BugFeatures.bugSwarm();
} else if (BugFeatures.shouldGlitch()) {
    // 30% chance AI go glitch instead of normal reply
    System.out.println("TERRIFIER AI: " + BugFeatures.getGlitch());
} else {
    // Your normal AI reply here
    System.out.println("TERRIFIER AI: " + yourNormalReply);
}

// For scary typing
BugFeatures.scaryType("Art is coming for you...");
