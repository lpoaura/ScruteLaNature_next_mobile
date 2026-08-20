import React from 'react';
import { StyleSheet, ScrollView, View, Text, Image, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Code, Landmark } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function CreditsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, isDark && styles.darkContainer, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={isDark ? '#F8FAFC' : '#141B20'} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Partenaires & Crédits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
        {/* Intro */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.introSection}>
          <Image source={require('@/assets/images/new-logo.png')} style={styles.mainLogo} resizeMode="contain" />
          <Text style={[styles.introText, isDark && styles.darkTextMuted]}>
            L'application Scrute la Nature vous est proposée grâce au soutien et à la participation de nombreux acteurs engagés pour la biodiversité.
          </Text>
        </Animated.View>

        {/* Porteurs du projet */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.section, isDark && styles.darkSection]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
              <Heart size={20} color="#16A34A" />
            </View>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Porteurs du projet</Text>
          </View>
          <View style={styles.logosGrid}>
            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_LPO_credits.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>LPO Auvergne-Rhône-Alpes</Text>
            </View>
            {/* <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_Oelie_Sainte.jpg')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>Oélié</Text>
            </View>
            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_LPO.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>LPO France</Text>
            </View> */}
          </View>
        </Animated.View>

        {/* Soutiens financiers */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.section, isDark && styles.darkSection]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF9C3' }]}>
              <Landmark size={20} color="#CA8A04" />
            </View>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Soutiens Financiers</Text>
          </View>
          <Text style={[styles.sectionDescription, isDark && styles.darkTextMuted]}>
            Ce projet a été rendu possible grâce aux financements de nos partenaires institutionnels.
          </Text>
          <View style={styles.logosGrid}>
            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_France_Kit.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_OFB.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_Oelie_Sainte.jpg')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>Oélié</Text>
            </View>
            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_SEM_Engagee.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>Saint-Étienne Métropole</Text>
            </View>
          </View>
        </Animated.View>

        {/* Réalisation Technique */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={[styles.section, isDark && styles.darkSection]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
              <Code size={20} color="#4F46E5" />
            </View>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Réalisation Technique</Text>
          </View>
          <Text style={[styles.sectionDescription, isDark && styles.darkTextMuted]}>
            L'application a été développée en collaboration avec les étudiants et les professionnels de :
          </Text>
          <View style={styles.logosGrid}>
            
            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_LPO.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>LPO France</Text>
            </View>

              <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_LPO.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>LPO France</Text>
            </View>

            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/OISEAU_MAG_Junior26.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>L'oiseau Mag Junior</Text>
            </View>

            <View style={styles.logoItem}>
              <Image source={require('@/assets/images/logo_Telecom_St_Etienne.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.logoText, isDark && styles.darkText]}>Initialement développé par{'\n'}Télécom Saint-Étienne</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={[styles.footerText, isDark && styles.darkTextMuted]}>
          © {new Date().getFullYear()} LPO Auvergne-Rhône-Alpes. Tous droits réservés.
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  darkContainer: {
    backgroundColor: '#0A0E11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkHeader: {
    backgroundColor: '#141B20',
    borderBottomColor: '#202C35',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#141B20',
  },
  scrollContent: {
    padding: 20,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  mainLogo: {
    width: 200,
    height: 100,
    marginBottom: 16,
  },
  introText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  darkSection: {
    backgroundColor: '#141B20',
    shadowColor: '#000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#141B20',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  logosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  logoItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
  },
  logoImage: {
    width: '100%',
    height: 70,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#202C35',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  darkText: {
    color: '#F8FAFC',
  },
  darkTextMuted: {
    color: '#94A3B8',
  },
});
