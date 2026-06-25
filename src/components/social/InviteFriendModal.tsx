import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socialService } from '@/src/services/social.service';
import type { Friendship } from '@/src/types/api.types';

interface Props {
  visible: boolean;
  parcoursId: string;
  onClose: () => void;
}

export default function InviteFriendModal({ visible, parcoursId, onClose }: Props) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const data = await socialService.getFriends();
      setFriends(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (friendId: string) => {
    try {
      setSending(friendId);
      await socialService.sendParcoursInvitation(friendId, parcoursId);
      Alert.alert('Succès', 'Invitation envoyée !');
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Erreur lors de l\'envoi.';
      Alert.alert('Erreur', msg);
    } finally {
      setSending(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Inviter un ami</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2D6A4F" style={{ marginTop: 40 }} />
          ) : friends.length === 0 ? (
            <Text style={styles.emptyText}>Vous n'avez pas encore d'amis à inviter.</Text>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(f) => f.friend?.id || Math.random().toString()}
              renderItem={({ item }) => {
                const friend = item.friend;
                if (!friend) return null;
                return (
                  <View style={styles.friendRow}>
                    <View style={styles.friendInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{friend.pseudo ? friend.pseudo.charAt(0).toUpperCase() : '?'}</Text>
                      </View>
                      <Text style={styles.friendName}>{friend.pseudo || 'Utilisateur'}</Text>
                    </View>
                    <Pressable
                      style={[styles.inviteBtn, sending === friend.id && styles.inviteBtnDisabled]}
                      onPress={() => handleInvite(friend.id)}
                      disabled={sending === friend.id}
                    >
                      {sending === friend.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.inviteText}>Inviter</Text>
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
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
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  inviteBtn: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteBtnDisabled: {
    opacity: 0.7,
  },
  inviteText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
