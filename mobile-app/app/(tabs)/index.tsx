// mobile-app/app/(tabs)/index.tsx

import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  View,
  Modal,
  Pressable,
  Platform,
  Alert,
  TextInput,
  ScrollView,
  useColorScheme
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import Wheel from '@/components/Wheel';
import RequestPanel, { WheelItem, WinnerRequest } from '@/components/RequestPanel';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';

// View States for our flow
type ViewState = 'LOGIN' | 'GROUPS' | 'WHEEL';

interface WheelGroup {
  id: string;
  groupName: string;
  inviteCode: string;
  members: { username: string; occurrences: number; active: boolean }[];
}

interface CurrentWinnerInfo {
  name: string;
  winTime: Date;
}

export default function HomeScreen() {
  const theme = useColorScheme() ?? 'light';
  const [viewState, setViewState] = useState<ViewState>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication & Groups
  const [username, setUsername] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [userGroups, setUserGroups] = useState<WheelGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<WheelGroup | null>(null);

  // Group Inputs
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Wheel States
  const [items, setItems] = useState<WheelItem[]>([]);
  const [requests, setRequests] = useState<WinnerRequest[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [currentWinnerInfo, setCurrentWinnerInfo] = useState<CurrentWinnerInfo | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    setLoading(true);
    let storedUser = Platform.OS === 'web' ? localStorage.getItem('userToken') : await SecureStore.getItemAsync('userToken');

    if (storedUser) {
      setUsername(storedUser);
      await fetchUserGroups(storedUser);
    } else {
      setViewState('LOGIN');
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!inputUsername.trim() || !inputPassword.trim()) {
      Alert.alert("Error", "Please enter both username and password.");
      return;
    }

    const user = inputUsername.trim();

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: inputPassword }),
      });

      if (response.ok) {
        if (Platform.OS === 'web') {
          localStorage.setItem('userToken', user);
        } else {
          await SecureStore.setItemAsync('userToken', user);
        }

        setUsername(user);
        setInputPassword(''); // Clear password from memory
        await fetchUserGroups(user);
      } else {
        Alert.alert('Error', 'Invalid username or password.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to the server.');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') localStorage.removeItem('userToken');
    else await SecureStore.deleteItemAsync('userToken');
    setUsername(null);
    setViewState('LOGIN');
  };

  // --- GROUPS LOGIC ---
  const fetchUserGroups = async (user: string) => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${API_URL}/api/groups/user/${user}`);
      if (res.ok) {
        const groups: WheelGroup[] = await res.json();
        setUserGroups(groups);

        if (groups.length === 1) {
          // Auto-redirect to their only group
          loadGroupData(groups[0]);
        } else {
          setViewState('GROUPS');
        }
      }
    } catch (e) {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert("Wait", "Please enter a group name first.");
      return;
    }

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName: newGroupName.trim(), username })
      });

      if (res.ok) {
        const createdGroup = await res.json();
        setNewGroupName('');
        await fetchUserGroups(username!);
        loadGroupData(createdGroup); // Instantly redirect
      } else {
        const errorMsg = await res.text();
        Alert.alert("Could not create group", errorMsg);
      }
    } catch (e) {
      Alert.alert("Error", "Could not connect to the server.");
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCodeInput.trim()) return;

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${API_URL}/api/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCodeInput.trim(), username })
      });

      if (res.ok) {
        const joinedGroup = await res.json();
        setInviteCodeInput('');
        await fetchUserGroups(username!);
        loadGroupData(joinedGroup); // Instantly redirect
      } else {
        Alert.alert("Error", await res.text());
      }
    } catch (e) {
      Alert.alert("Error", "Could not connect to the server.");
    }
  };

  // --- WHEEL LOGIC (Scoped to Group) ---
  const loadGroupData = async (group: WheelGroup) => {
    setActiveGroup(group);
    setViewState('WHEEL');
    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      // Map backend MemberStat to frontend WheelItem
      const wheelItems: WheelItem[] = group.members.map(m => ({
        id: m.username,
        name: m.username,
        occurrences: m.occurrences,
        active: m.active
      }));
      setItems(wheelItems);

      // Fetch Scoped Winner & Requests
      const [winnerRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/api/current-winner/${group.id}`),
        fetch(`${API_URL}/api/requests/group/${group.id}`)
      ]);

      if (winnerRes.ok) {
        const cwData = await winnerRes.json();
        setCurrentWinnerInfo({ name: cwData.username, winTime: new Date(cwData.winTime) });
      } else {
        setCurrentWinnerInfo(null);
      }

      if (reqRes.ok) {
        const reqData: WinnerRequest[] = await reqRes.json();
        reqData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(reqData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshWheelData = async () => {
    if (activeGroup) await loadGroupData(activeGroup);
  };

  const sectorProbabilities = useMemo(() => {
    const activeItems = items.filter(item => item.active);
    if (activeItems.length <= 1) return activeItems.length === 1 ? [1] : [];

    const totalOccurrences = activeItems.reduce((sum, item) => sum + item.occurrences, 0);
    const weights = activeItems.map(item => totalOccurrences - item.occurrences);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight === 0) return activeItems.map(() => 1 / activeItems.length);
    return weights.map(weight => weight / totalWeight);
  }, [items]);

  useEffect(() => {
    if (!currentWinnerInfo) return;
    const intervalId = setInterval(() => {
      const diffSec = Math.floor(Math.max(0, new Date().getTime() - currentWinnerInfo.winTime.getTime()) / 1000);
      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      setElapsedTime(`${days > 0 ? days + 'd ' : ''}${hours > 0 ? hours + 'h ' : ''}${mins > 0 ? mins + 'm ' : ''}${secs}s`);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [currentWinnerInfo]);

  const handleSpinAttempt = async (): Promise<boolean> => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${API_URL}/api/wheel-lock/${activeGroup?.id}/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (res.status === 409) {
        setLockMessage(await res.text());
        setTimeout(() => setLockMessage(null), 3500);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSpinEnd = async (winningItem: WheelItem) => {
    setWinner(winningItem);
    setModalVisible(true);

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      await fetch(`${API_URL}/api/groups/${activeGroup?.id}/members/${winningItem.name}/increment`, { method: 'PUT' });
      await fetch(`${API_URL}/api/current-winner/${activeGroup?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: winningItem.name })
      });
      refreshWheelData();
    } catch (e) {}
  };


  // === RENDER METHODS ===

  // Dynamic styles for Light/Dark mode compatibility
  const dynamicStyles = {
    input: {
      color: theme === 'dark' ? '#fff' : '#000',
      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
    },
    divider: {
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
    }
  };

  if (loading) {
    return <ThemedView style={styles.center}><ActivityIndicator size="large" color="#A1CEDC" /></ThemedView>;
  }

  if (viewState === 'LOGIN') {
    return (
        <ThemedView style={styles.center}>
          <ThemedText type="title" style={{ marginBottom: 20 }}>Welcome!</ThemedText>

          <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter Username"
              placeholderTextColor="#888"
              value={inputUsername}
              onChangeText={setInputUsername}
              autoCapitalize="none"
          />

          <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Password"
              placeholderTextColor="#888"
              value={inputPassword}
              onChangeText={setInputPassword}
              secureTextEntry={true}
          />

          <Pressable style={styles.primaryButton} onPress={handleLogin}>
            <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Login</ThemedText>
          </Pressable>
        </ThemedView>
    );
  }

  if (viewState === 'GROUPS') {
    return (
        <ThemedView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.centerTop}>
            <ThemedText type="title" style={{ marginVertical: 30 }}>My Groups</ThemedText>

            {userGroups.length > 0 ? (
                userGroups.map(g => (
                    <Pressable key={g.id} style={styles.groupCard} onPress={() => loadGroupData(g)}>
                      <ThemedText type="defaultSemiBold">{g.groupName}</ThemedText>
                      <ThemedText style={{ color: '#4A90E2', fontSize: 18, fontWeight: 'bold' }}>→</ThemedText>
                    </Pressable>
                ))
            ) : (
                <ThemedText style={{ marginBottom: 20, color: '#888' }}>You don't belong to any groups yet.</ThemedText>
            )}

            <View style={[styles.divider, dynamicStyles.divider]} />

            <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Create a Group</ThemedText>
            <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="E.g., Apartment 4B"
                placeholderTextColor="#888"
                value={newGroupName}
                onChangeText={setNewGroupName}
            />
            <Pressable style={[styles.primaryButton, { marginBottom: 30 }]} onPress={handleCreateGroup}>
              <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Create</ThemedText>
            </Pressable>

            <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Join a Group</ThemedText>
            <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="6-Digit Invite Code"
                placeholderTextColor="#888"
                value={inviteCodeInput}
                onChangeText={setInviteCodeInput}
                autoCapitalize="characters"
            />
            <Pressable style={styles.primaryButton} onPress={handleJoinGroup}>
              <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Join</ThemedText>
            </Pressable>

            <Pressable style={{ marginTop: 50 }} onPress={handleLogout}>
              <ThemedText style={{ color: '#ff4444' }}>Logout ({username})</ThemedText>
            </Pressable>
          </ScrollView>
        </ThemedView>
    );
  }

  // viewState === 'WHEEL'
  return (
      <>
        <ParallaxScrollView headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }} headerImage={<ThemedText style={styles.headerEmoji}>🎡</ThemedText>}>

          <View style={styles.headerRow}>
            {/* Left: Back Button */}
            <Pressable style={{ flex: 1 }} onPress={() => setViewState('GROUPS')}>
              <ThemedText style={{ color: '#4A90E2' }}>← Back</ThemedText>
            </Pressable>

            {/* Center: Group Name */}
            <ThemedText type="defaultSemiBold" style={{ flex: 2, textAlign: 'center' }}>
              {activeGroup?.groupName}
            </ThemedText>

            {/* Right: Invite Code Button */}
            <Pressable
                style={{ flex: 1, alignItems: 'flex-end' }}
                onPress={async () => {
                  if (activeGroup?.inviteCode) {
                    await Clipboard.setStringAsync(activeGroup.inviteCode);
                    Alert.alert('Copied!', 'Invite code copied to clipboard.');
                  }
                }}
            >
              <View style={{ backgroundColor: 'rgba(80, 227, 194, 0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: '#50E3C2' }}>
                  Code: {activeGroup?.inviteCode}
                </ThemedText>
              </View>
            </Pressable>
          </View>

          {currentWinnerInfo && (
              <ThemedView style={styles.currentWinnerContainer}>
                <ThemedText style={styles.currentWinnerText}>👑 Active Winner: {currentWinnerInfo.name}</ThemedText>
                <ThemedText style={styles.timerText}>Time in duty: {elapsedTime}</ThemedText>
              </ThemedView>
          )}

          {items.length > 1 ? (
              <View>
                {lockMessage && (
                    <ThemedView style={styles.lockBanner}>
                      <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>🔒 {lockMessage}</ThemedText>
                    </ThemedView>
                )}
                <Wheel items={items.filter(item => item.active)} probabilities={sectorProbabilities} disabled={false} onSpinAttempt={handleSpinAttempt} onSpinEnd={handleSpinEnd} />
              </View>
          ) : (
              <ThemedText style={styles.centeredText}>Add at least two members to spin!</ThemedText>
          )}

          {activeGroup && (
              <RequestPanel groupId={activeGroup.id} items={items} requests={requests} username={username} onRefresh={refreshWheelData} />
          )}
        </ParallaxScrollView>

        <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalContent}>
              <ThemedText type="subtitle">🎉 The Winner Is... 🎉</ThemedText>
              <ThemedText type="title" style={styles.winnerText}>{winner?.name}</ThemedText>
              <Pressable style={styles.primaryButton} onPress={() => setModalVisible(false)}>
                <ThemedText style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Awesome!</ThemedText>
              </Pressable>
            </ThemedView>
          </View>
        </Modal>
      </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  centerTop: { alignItems: 'center', padding: 20, paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  input: { width: '80%', height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 15 },
  primaryButton: { backgroundColor: '#4A90E2', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, alignItems: 'center' },
  groupCard: { width: '90%', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: 'rgba(74, 144, 226, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(74, 144, 226, 0.3)', marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, width: '80%', marginVertical: 30 },

  currentWinnerContainer: { marginHorizontal: 20, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(74, 144, 226, 0.1)', borderWidth: 1, borderColor: 'rgba(74, 144, 226, 0.3)' },
  currentWinnerText: { fontSize: 18, fontWeight: 'bold', color: '#4A90E2' },
  timerText: { fontSize: 14, marginTop: 4, fontVariant: ['tabular-nums'] },
  headerEmoji: { fontSize: 80, bottom: 10, left: 20, position: 'absolute' },
  centeredText: { textAlign: 'center', marginTop: 40, fontSize: 16, paddingHorizontal: 20 },
  lockBanner: { backgroundColor: '#ff4444', padding: 10, borderRadius: 8, marginBottom: 10, alignItems: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { margin: 20, borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '80%' },
  winnerText: { marginVertical: 20, color: '#50E3C2' }
});