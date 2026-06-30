with open('lpo-balades-mobile/app/(tabs)/profile/friends.tsx', 'r') as f:
    content = f.read()

replacements = {
    "backgroundColor: isDark ? '#1E293B' : '#FFFFFF'": "backgroundColor: '#FFFFFF'",
    "backgroundColor: isDark ? '#3730A3' : '#E0E7FF'": "backgroundColor: '#E0E7FF'",
    "backgroundColor: isDark ? '#334155' : '#F3F4F6'": "backgroundColor: '#F3F4F6'",
    "backgroundColor: isDark ? '#0F172A' : '#F3F4F6'": "backgroundColor: '#F3F4F6'",
    "color: isDark ? '#CBD5E1' : '#4B5563'": "color: '#4B5563'",
    "color: isDark ? '#A5B4FC' : '#4F46E5'": "color: '#4F46E5'",
    "color: isDark ? '#F9FAFB' : '#1F2937'": "color: '#1F2937'",
    "color: isDark ? '#9CA3AF' : '#4B5563'": "color: '#4B5563'",
    "color: isDark ? '#F8FAFC' : '#111827'": "color: '#111827'",
    "color: isDark ? '#9CA3AF' : '#6B7280'": "color: '#6B7280'",
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open('lpo-balades-mobile/app/(tabs)/profile/friends.tsx', 'w') as f:
    f.write(content)
