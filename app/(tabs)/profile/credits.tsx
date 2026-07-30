import React from 'react';
import { StyleSheet, ScrollView, View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function CreditsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  // Importation des logos
  const logoLPOAura = require('@/assets/images/logo_LPO_credits.png');
  const logoSEM = require('@/assets/images/logo_SEM_Engagee.png');
  const logoTSE = require('@/assets/images/logo_Telecom_St_Etienne.png');
  const logoOel = require('@/assets/images/logo_Oelie_Sainte.jpg');
  const logoLPOFr = require('@/assets/images/logo_LPO.png');
  const logoFrN = require('@/assets/images/logo_France_Nature.png');
  const logoFrK = require('@/assets/images/logo_France_Kit.png');
  const logoOFB = require('@/assets/images/logo_OFB_actualite.jpg');

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }, isDark && styles.darkHeader]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={isDark ? '#F8FAFC' : '#1E293B'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.darkText]}>Partenaires & Crédits</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.card, isDark && styles.darkCard]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Un jeu conçu et édité par</Text>
          <Text style={[styles.description, isDark && styles.darkTextMuted]}>
            La LPO AuRA en partenariat avec l'école d'ingénieurs Télécom Saint-Étienne
          </Text>
          <View style={styles.logoGrid}>
            <Image source={logoLPOAura} style={styles.logo} resizeMode="contain" />
            <Image source={logoTSE} style={styles.logo} resizeMode="contain" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.card, isDark && styles.darkCard]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Réalisation</Text>
          <Text style={[styles.description, isDark && styles.darkTextMuted]}>
            Graphiques: C.Rousse - LPO France - L'OISEAU MAG Junior
          </Text>
          <Text style={[styles.description, isDark && styles.darkTextMuted]}>
            Application réalisée dans le cadre de l’Atlas de la biodiversité Intercommunal (ABI) de Saint-Etienne Métropôle, projet en partenariat avec FNE et la LPO
          </Text>
          <View style={styles.logoGridCentered}>
            <Image source={logoFrN} style={styles.logoSmall} resizeMode="contain" />
            <Image source={logoLPOFr} style={styles.logoSmall} resizeMode="contain" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.card, isDark && styles.darkCard]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Jeu soutenu par</Text>
          <View style={styles.logoGrid}>
            <Image source={logoFrK} style={styles.logo} resizeMode="contain" />
            <Image source={logoOFB} style={styles.logo} resizeMode="contain" />
            <Image source={logoSEM} style={styles.logo} resizeMode="contain" />
            <Image source={logoOel} style={styles.logo} resizeMode="contain" />
          </View>
        </Animated.View>
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
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  darkHeader: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#1E293B',
    shadowColor: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0087CC',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  logoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 8,
  },
  logoGridCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginTop: 8,
  },
  logo: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
  logoSmall: {
    width: 80,
    height: 60,
  },
  darkText: {
    color: '#F8FAFC',
  },
  darkTextMuted: {
    color: '#94A3B8',
  },
});
