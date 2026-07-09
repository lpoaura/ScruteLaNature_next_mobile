import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  FlatList, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Users, UserPlus, Search, Check, X, ChevronLeft, MapPin } from 'lucide-react-native';
import { socialService } from '@/src/services/social.service';
import type { Friendship, ParcoursInvitation } from '@/src/types/api.types';
import { useSettingsStore } from '@/src/store/settings.store';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'amis' | 'demandes' | 'invitations';

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';
  
  const [activeTab, setActiveTab] = useState<Tab>('amis');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [invitations, setInvitations] = useState<ParcoursInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; pseudo: string }>>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'amis') {
        const data = await socialService.getFriends();
        setFriends(data);
      } else if (activeTab === 'demandes') {
        const data = await socialService.getFriendRequests();
        setRequests(data);
      } else {
        const data = await socialService.getParcoursInvitations();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des amis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length >= 2) {
        setIsFetchingSuggestions(true);
        try {
          const suggestions = await socialService.searchUsers(searchQuery.trim());
          setSearchSuggestions(suggestions);
        } catch (error) {
          // ignorer les erreurs de frappe rapide
          setSearchSuggestions([]);
        } finally {
          setIsFetchingSuggestions(false);
        }
      } else {
        setSearchSuggestions([]);
        setIsFetchingSuggestions(false);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async () => {
    handleSendRequest(searchQuery);
  };

  const handleSendRequest = async (pseudoToAdd: string) => {
    if (!pseudoToAdd.trim()) return;
    
    setIsSearching(true);
    try {
      await socialService.sendFriendRequest(pseudoToAdd.trim());
      Alert.alert('Succès', `Demande d'ami envoyée à ${pseudoToAdd}`);
      setSearchQuery('');
      setSearchSuggestions([]);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || "Impossible d'envoyer la demande.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRespondRequest = async (id: string, accept: boolean) => {
    try {
      await socialService.respondFriendRequest(id, accept);
      // Retirer la requête de la liste localement
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (accept) {
        Alert.alert('Succès', 'Ami ajouté !');
        // Optionnel : recharger la liste des amis si on revient sur l'onglet
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de répondre à la demande.');
    }
  };

  const handleRespondInvitation = async (id: string, accept: boolean, parcoursId?: string) => {
    try {
      await socialService.respondToInvitation(id, accept);
      setInvitations((prev) => prev.filter((r) => r.id !== id));
      if (accept && parcoursId) {
        Alert.alert('Défi accepté !', 'Redirection vers le parcours...');
        router.push(`/parcours/${parcoursId}`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de répondre à l\'invitation.');
    }
  };

  const renderFriend = ({ item }: { item: any }) => {
    // getFriends renvoie { friendshipId, friend, since } côté backend
    // on vérifie donc item.friend en priorité, ou on retombe sur la structure complète
    const friendPseudo = item.friend?.pseudo || item.requester?.pseudo || item.receiver?.pseudo || 'Joueur inconnu';

    return (
      <View style={[styles.friendCard, isDark && styles.darkCard]}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{friendPseudo.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.friendName, isDark && styles.darkText]}>{friendPseudo}</Text>
      </View>
    );
  };

  const renderRequest = ({ item }: { item: Friendship }) => {
    const requesterPseudo = item.requester?.pseudo || 'Joueur inconnu';

    return (
      <View style={[styles.friendCard, isDark && styles.darkCard]}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{requesterPseudo.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={[styles.friendName, isDark && styles.darkText]}>{requesterPseudo}</Text>
          <Text style={styles.requestSubtitle}>Souhaite vous ajouter</Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleRespondRequest(item.id, true)}
          >
            <Check size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable 
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleRespondRequest(item.id, false)}
          >
            <X size={20} color="#6B7280" />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderInvitation = ({ item }: { item: ParcoursInvitation }) => {
    const senderPseudo = item.sender?.pseudo || 'Joueur inconnu';
    const parcoursTitle = item.parcours?.title || 'Parcours inconnu';

    return (
      <View style={[styles.friendCard, isDark && styles.darkCard]}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: '#D8E8C5' }]}>
          <MapPin size={24} color="#0087CC" />
        </View>
        <View style={styles.requestInfo}>
          <Text style={[styles.friendName, isDark && styles.darkText]}>{senderPseudo}</Text>
          <Text style={styles.requestSubtitle}>vous défie sur : {parcoursTitle}</Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleRespondInvitation(item.id, true, item.parcoursId)}
          >
            <Check size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable 
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleRespondInvitation(item.id, false)}
          >
            <X size={20} color="#6B7280" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDark && styles.darkContainer, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, isDark && styles.darkCard]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Réseau d'amis</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={{ zIndex: 10 }}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Ajouter un ami (Pseudo)"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="send"
              onSubmitEditing={handleSearch}
            />
            {isSearching && <ActivityIndicator size="small" color="#0087CC" />}
          </View>
          {searchQuery.length > 0 && (
            <Pressable style={styles.addButton} onPress={handleSearch}>
              <Text style={styles.addButtonText}>Envoyer</Text>
            </Pressable>
          )}
        </View>

        {/* Suggestions d'autocomplétion */}
        {searchQuery.trim().length >= 2 && (
          <View style={styles.suggestionsContainer}>
            {isFetchingSuggestions ? (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0087CC" />
              </View>
            ) : searchSuggestions.length > 0 ? (
              searchSuggestions.map((user) => (
                <Pressable 
                  key={user.id} 
                  style={styles.suggestionItem}
                  onPress={() => handleSendRequest(user.pseudo)}
                >
                  <View style={[styles.avatarPlaceholder, { width: 32, height: 32, borderRadius: 16, marginRight: 12 }]}>
                    <Text style={[styles.avatarText, { fontSize: 14 }]}>{user.pseudo.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.suggestionText}>{user.pseudo}</Text>
                  <UserPlus size={18} color="#0087CC" />
                </Pressable>
              ))
            ) : (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>Aucun utilisateur trouvé.</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'amis' && styles.activeTab]} 
          onPress={() => setActiveTab('amis')}
        >
          <Users size={20} color={activeTab === 'amis' ? '#0087CC' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'amis' && styles.activeTabText]}>Mes amis</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'demandes' && styles.activeTab]} 
          onPress={() => setActiveTab('demandes')}
        >
          <UserPlus size={20} color={activeTab === 'demandes' ? '#0087CC' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'demandes' && styles.activeTabText]}>Demandes</Text>
          {requests.length > 0 && activeTab !== 'demandes' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable 
          style={[styles.tab, activeTab === 'invitations' && styles.activeTab]} 
          onPress={() => setActiveTab('invitations')}
        >
          <MapPin size={20} color={activeTab === 'invitations' ? '#0087CC' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'invitations' && styles.activeTabText]}>Défis</Text>
          {invitations.length > 0 && activeTab !== 'invitations' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{invitations.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#0087CC" />
          </View>
        ) : activeTab === 'amis' ? (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriend}
            contentContainerStyle={styles.flatListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={48} color="#D1D5DB" />
                <Text style={[styles.emptyText, isDark && styles.darkTextMuted]}>Vous n'avez pas encore d'amis.</Text>
                <Text style={styles.emptySubtext}>Cherchez un pseudo ci-dessus pour envoyer une demande !</Text>
              </View>
            }
          />
        ) : activeTab === 'demandes' ? (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequest}
            contentContainerStyle={styles.flatListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <UserPlus size={48} color="#D1D5DB" />
                <Text style={[styles.emptyText, isDark && styles.darkTextMuted]}>Aucune demande en attente.</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={invitations}
            keyExtractor={(item) => item.id}
            renderItem={renderInvitation}
            contentContainerStyle={styles.flatListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MapPin size={48} color="#D1D5DB" />
                <Text style={[styles.emptyText, isDark && styles.darkTextMuted]}>Aucun défi reçu.</Text>
              </View>
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#0087CC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#D8E8C5',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#0087CC',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  requestInfo: {
    flex: 1,
  },
  requestSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#007E84',
  },
  declineButton: {
    backgroundColor: '#F3F4F6',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 100,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },

  darkContainer: { backgroundColor: '#0F172A' },
  darkCard: { backgroundColor: '#1E293B', shadowColor: '#000', borderColor: '#334155' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
  darkInput: { backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC' },
});
