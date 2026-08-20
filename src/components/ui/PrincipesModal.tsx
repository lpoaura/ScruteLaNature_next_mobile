import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

interface PrincipesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrincipesModal({ visible, onClose }: PrincipesModalProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
          <View style={styles.header}>
            <Text style={[styles.title, isDark && styles.darkText]}>Principes Scrute la nature</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={isDark ? '#94A3B8' : '#64748B'} />
            </Pressable>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.paragraph, isDark && styles.darkText]}>
              « Scrute la Nature » est un jeu de piste qui t'amène à la rencontre des êtres vivants qui t'entourent. Résous des énigmes, collectionne les badges et deviens, toi aussi, incollable sur la nature qui t'entoure ! Attention, tu ne pourras revenir en arrière sur le jeu. Donc souviens-toi bien de tous les indices.
            </Text>

            <View style={[styles.alertBox, isDark && styles.darkAlertBox]}>
              <Text style={[styles.alertText, isDark && styles.darkAlertText]}>
                <Text style={{ fontWeight: 'bold' }}>Important :</Text> Tu partages cet espace naturel avec d'autres êtres vivants ! Merci de respecter le lieu dans lequel tu es. La nature te remercie.
              </Text>
            </View>

            <Text style={[styles.heading, isDark && styles.darkText]}>Pour jouer, rien de plus simple :</Text>
            <Text style={[styles.paragraph, isDark && styles.darkText]}>
              Sélectionne le parcours de ton choix et laisse-toi guider. Il est nécessaire d'activer la géolocalisation pour déclencher les étapes et les énigmes. À la fin, ton score apparaîtra et tu pourras recommencer le parcours autant de fois que tu le souhaites pour devenir un véritable expert.
            </Text>

            <Text style={[styles.heading, isDark && styles.darkText]}>Pour jouer hors ligne :</Text>
            <Text style={[styles.paragraph, isDark && styles.darkText]}>
              Il faut d'abord télécharger le parcours une première fois sur son téléphone en ayant une connexion internet (Wifi ou 4G). Ensuite, une fois sur le terrain hors-ligne, tu peux sélectionner ton parcours et jouer sans problème !
            </Text>

            <Text style={[styles.heading, isDark && styles.darkText]}>Envie de pimenter le jeu ?</Text>
            <Text style={[styles.paragraph, isDark && styles.darkText]}>
              Un mode escape game existe lorsque l'on a un compte. Serez-vous le plus malin et le plus rapide pour répondre à toutes les questions ?
            </Text>

            <Text style={[styles.heading, isDark && styles.darkText]}>Mode invité ou compte utilisateur ?</Text>
            <Text style={[styles.paragraph, isDark && styles.darkText]}>
              Dans les deux cas, vous pourrez explorer et jouer librement ! Cependant, créer un compte utilisateur vous permet de débloquer plusieurs avantages exclusifs :
            </Text>
            
            <View style={styles.list}>
              <Text style={[styles.listItem, isDark && styles.darkText]}>
                <Text style={{ fontWeight: 'bold' }}>• Sauvegarde de votre progression :</Text> Vos données (parcours effectués, badges débloqués, XP et scores) sont associées à votre compte et sauvegardées en ligne. Vous ne perdrez rien, même si vous changez de téléphone ou désinstallez l'application !
              </Text>
              <Text style={[styles.listItem, isDark && styles.darkText]}>
                <Text style={{ fontWeight: 'bold' }}>• Réseau d'amis et défis :</Text> Vous pourrez ajouter vos proches en amis, voir leur progression, et surtout les inviter ou les défier sur vos parcours préférés.
              </Text>
              <Text style={[styles.listItem, isDark && styles.darkText]}>
                <Text style={{ fontWeight: 'bold' }}>• Laisser des avis :</Text> Vous aurez la possibilité de noter les parcours terminés et de partager votre expérience pour guider les futurs explorateurs.
              </Text>
              <Text style={[styles.listItem, isDark && styles.darkText]}>
                <Text style={{ fontWeight: 'bold' }}>• Mode Escape Game :</Text> L'accès à ce mode de jeu chronométré et intense est exclusif aux comptes utilisateurs.
              </Text>
            </View>

            <Text style={[styles.heading, isDark && styles.darkText]}>Vos retours sont précieux</Text>
            <Text style={[styles.paragraph, isDark && styles.darkText]}>
              L'envie de faire connaitre un parcours, de partager une belle rencontre avec la faune sauvage ou besoin de signaler une difficulté ? Ce jeu est pour vous et alimenté par vous ! N'hésitez pas à nous transmettre vos impressions en direct ou à laisser vos évaluations pour aider la communauté.
            </Text>
            <Text style={[styles.paragraph, isDark && styles.darkText, { fontStyle: 'italic', marginTop: -4 }]}>
              Contactez-nous à : contact@lpo.fr
            </Text>

            <Text style={[styles.footerText, isDark && styles.darkText]}>
              L'équipe Scrute la Nature vous remercie !
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  darkModalContent: {
    backgroundColor: '#0A0E11',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 16,
  },
  alertBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  darkAlertBox: {
    backgroundColor: '#062A24',
    borderLeftColor: '#34D399',
  },
  alertText: {
    color: '#166534',
    fontSize: 15,
    lineHeight: 22,
  },
  darkAlertText: {
    color: '#A7F3D0',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 12,
  },
  list: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  darkText: {
    color: '#F8FAFC',
  },
});
