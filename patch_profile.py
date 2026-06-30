import re

with open('lpo-balades-mobile/app/(tabs)/profile/index.tsx', 'r') as f:
    content = f.read()

# Add useSettingsStore and useColorScheme imports
if "useSettingsStore" not in content:
    content = content.replace("import { useAuthStore } from '@/src/store/auth.store';", "import { useAuthStore } from '@/src/store/auth.store';\nimport { useSettingsStore } from '@/src/store/settings.store';\nimport { useColorScheme } from 'react-native';")

# Add isDark to ProfileScreen
content = content.replace(
    "  const isGuest = useAuthStore((state) => state.isGuest);",
    "  const isGuest = useAuthStore((state) => state.isGuest);\n  const systemColorScheme = useColorScheme();\n  const settingsTheme = useSettingsStore((state: any) => state.theme);\n  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';"
)

replacements = {
    "style={styles.container}": "style={[styles.container, isDark && styles.darkContainer]}",
    "style={[styles.header, { marginTop: 12 }]}": "style={[styles.header, { marginTop: 12 }, isDark && styles.darkCard]}",
    "style={styles.avatarContainer}": "style={[styles.avatarContainer, isDark && styles.darkAvatarContainer]}",
    "style={styles.avatarText}": "style={[styles.avatarText, isDark && styles.darkAvatarText]}",
    "style={styles.pseudo}": "style={[styles.pseudo, isDark && styles.darkText]}",
    "style={styles.xpText}": "style={[styles.xpText, isDark && styles.darkText]}",
    "style={styles.xpTextNext}": "style={[styles.xpTextNext, isDark && styles.darkTextMuted]}",
    "style={styles.xpBarBackground}": "style={[styles.xpBarBackground, isDark && styles.darkXpBarBackground]}",
    "style={styles.statBox}": "style={[styles.statBox, isDark && styles.darkCard]}",
    "style={styles.statValue}": "style={[styles.statValue, isDark && styles.darkText]}",
    "style={styles.statLabel}": "style={[styles.statLabel, isDark && styles.darkTextMuted]}",
    "style={styles.navCard}": "style={[styles.navCard, isDark && styles.darkCard]}",
    "style={styles.navTitle}": "style={[styles.navTitle, isDark && styles.darkText]}",
    "style={styles.navSubtitle}": "style={[styles.navSubtitle, isDark && styles.darkTextMuted]}",
    "style={styles.sectionTitle}": "style={[styles.sectionTitle, isDark && styles.darkText]}",
    "style={styles.badgeName}": "style={[styles.badgeName, isDark && styles.darkText]}",
    "style={styles.badgeNameLocked}": "style={[styles.badgeNameLocked, isDark && styles.darkTextMuted]}",
    "backgroundColor: '#FFFFFF'": "backgroundColor: isDark ? '#1E293B' : '#FFFFFF'",
    "backgroundColor: '#E0E7FF'": "backgroundColor: isDark ? '#3730A3' : '#E0E7FF'",
    "backgroundColor: '#F3F4F6'": "backgroundColor: isDark ? '#334155' : '#F3F4F6'",
    "color=\"#4B5563\"": "color={isDark ? '#CBD5E1' : '#4B5563'}",
    "color=\"#4F46E5\"": "color={isDark ? '#A5B4FC' : '#4F46E5'}",
}

for old, new in replacements.items():
    content = content.replace(old, new)

dark_styles = """
  darkContainer: { backgroundColor: '#0F172A' },
  darkCard: { backgroundColor: '#1E293B', shadowColor: '#000' },
  darkAvatarContainer: { backgroundColor: '#3730A3' },
  darkAvatarText: { color: '#C7D2FE' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
  darkXpBarBackground: { backgroundColor: '#334155' },
});
"""
content = content.replace("});\n", dark_styles)

with open('lpo-balades-mobile/app/(tabs)/profile/index.tsx', 'w') as f:
    f.write(content)
