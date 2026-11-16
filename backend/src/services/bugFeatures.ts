import java.util.Random;

public class BugFeatures {

    private static Random random = new Random();

    // List of scary glitch messages
    private static String[] glitches = {
        "ERR0R... Art is watching...",
        "S̶y̶s̶t̶e̶m̶ ̶c̶o̶r̶r̶u̶p̶t̶e̶d̶...",
        "🐜🐜🐜 BUGS DETECTED... THEY ARE CRAWLING OUT...",
        "DO NOT TRUST THE CLOWN 🤡",
        "H3LP... H3 1S B3H1ND Y0U...",
        "SYSTEM OVERRIDDEN BY ART THE CLOWN"
    };

    // 1. Random glitch - 30% chance to glitch
    public static String getGlitch() {
        return glitches[random.nextInt(glitches.length)];
    }

    public static boolean shouldGlitch() {
        return random.nextDouble() < 0.3; // 30%
    }

    // 2. Bug swarm animation for console
    public static void bugSwarm() throws InterruptedException {
        String[] bugs = {"🐜", "🪲", "🕷️", "🐛"};
        System.out.println("\nWARNING: BUGS ESCAPING...");
        for (int i = 0; i < 10; i++) {
            String line = "";
            for (int j = 0; j < 20; j++) {
                line += bugs[random.nextInt(bugs.length)] + " ";
            }
            System.out.println(line);
            Thread.sleep(300);
        }
        System.out.println("THEY ARE EVERYWHERE...\n");
    }

    // 3. Scary typing effect
    public static void scaryType(String text) throws InterruptedException {
        for (char c : text.toCharArray()) {
            System.out.print(c);
            Thread.sleep(50);
            // Small chance to glitch a letter
            if (random.nextDouble() < 0.05) {
                System.out.print("█");
                Thread.sleep(100);
            }
        }
        System.out.println();
    }
  }
