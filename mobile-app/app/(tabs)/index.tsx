// mobile-app/app/(tabs)/index.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, ActivityIndicator, View, Modal, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import Wheel from '@/components/Wheel';

interface WheelItem {
  id: string;
  name: string;
  occurrences: number;
  active: boolean;
}

interface CurrentWinnerInfo {
  name: string;
  winTime: Date;
}

export default function HomeScreen() {
  const [items, setItems] = useState<WheelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);

  // New states for the active winner and timer
  const [currentWinnerInfo, setCurrentWinnerInfo] = useState<CurrentWinnerInfo | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('');

  // Memoize the probability calculation
  const sectorProbabilities = useMemo(() => {
    const activeItems = items.filter(item => item.active);
    if (activeItems.length <= 1) {
      return activeItems.length === 1 ? [1] : [];
    }

    const totalOccurrences = activeItems.reduce((sum, item) => sum + item.occurrences, 0);
    const weights = activeItems.map(item => totalOccurrences - item.occurrences);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight === 0) {
      return activeItems.map(() => 1 / activeItems.length);
    }
    return weights.map(weight => weight / totalWeight);
  }, [items]);

  // Initial Fetch (Wheel items + Current Winner)
  useEffect(() => {
    const fetchInitialData = async () => {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) {
        setError("API URL is not defined in .env");
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Wheel Items
        const itemsRes = await fetch(`${API_URL}/api/wheel-items`);
        if (!itemsRes.ok) throw new Error(`Server error: ${itemsRes.status}`);
        const itemsData: WheelItem[] = await itemsRes.json();
        setItems(itemsData);

        // 2. Fetch Current Winner
        const winnerRes = await fetch(`${API_URL}/api/current-winner`);
        if (winnerRes.status === 200) {
          const cwData = await winnerRes.json();
          // Find the name of the winner using the ID
          const winnerItem = itemsData.find(i => i.id === cwData.wheelItemId);
          if (winnerItem) {
            setCurrentWinnerInfo({
              name: winnerItem.name,
              winTime: new Date(cwData.winTime)
            });
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Timer Effect (Updates every second if a winner exists)
  useEffect(() => {
    if (!currentWinnerInfo) return;

    const updateTimer = () => {
      const now = new Date();
      // Calculate diff in milliseconds
      const diffMs = Math.max(0, now.getTime() - currentWinnerInfo.winTime.getTime());
      const diffSec = Math.floor(diffMs / 1000);

      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      let timeStr = '';
      if (days > 0) timeStr += `${days}d `;
      if (hours > 0) timeStr += `${hours}h `;
      if (minutes > 0) timeStr += `${minutes}m `;
      timeStr += `${seconds}s`;

      setElapsedTime(timeStr);
    };

    updateTimer(); // Initial call to avoid 1s delay
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [currentWinnerInfo]);

  // Database update logic
  const updateWinnerInDatabase = async (winningItem: WheelItem) => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      // 1. Increment Occurrence
      const incRes = await fetch(`${API_URL}/api/wheel-items/${winningItem.id}/increment`, {
        method: 'PUT',
      });
      if (!incRes.ok) throw new Error('Failed to update winner occurrences.');
      const updatedItem = await incRes.json();

      setItems(currentItems =>
          currentItems.map(item =>
              item.id === updatedItem.id ? updatedItem : item
          )
      );

      // 2. Set as Current Winner (starts the new timer)
      const cwRes = await fetch(`${API_URL}/api/current-winner/${winningItem.id}`, {
        method: 'POST',
      });
      if (!cwRes.ok) throw new Error('Failed to set current winner.');
      const cwData = await cwRes.json();

      setCurrentWinnerInfo({
        name: winningItem.name,
        winTime: new Date(cwData.winTime)
      });

    } catch (e) {
      console.error(e);
    }
  };

  const handleSpinEnd = (winningItem: WheelItem) => {
    setWinner(winningItem);
    setModalVisible(true);
    updateWinnerInDatabase(winningItem); // Trigger both updates!
  };

  return (
      <>
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={<ThemedText style={styles.headerEmoji}>🎡</ThemedText>}
        >
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Chore Wheel</ThemedText>
          </ThemedView>

          {/* ACTIVE WINNER DISPLAY */}
          {currentWinnerInfo && !loading && !error && (
              <ThemedView style={styles.currentWinnerContainer}>
                <ThemedText style={styles.currentWinnerText}>
                  👑 Active Winner: {currentWinnerInfo.name}
                </ThemedText>
                <ThemedText style={styles.timerText}>
                  Time in duty: {elapsedTime}
                </ThemedText>
              </ThemedView>
          )}

          {loading && <ActivityIndicator size="large" color="#A1CEDC" style={{ marginTop: 20 }} />}

          {error && (
              <ThemedView style={styles.errorContainer}>
                <ThemedText style={{ color: '#ff4444' }}>⚠️ {error}</ThemedText>
                <ThemedText type="default">Check if Java is running and IP is correct.</ThemedText>
              </ThemedView>
          )}

          {!loading && items.length > 1 && (
              <Wheel
                  items={items.filter(item => item.active)}
                  probabilities={sectorProbabilities}
                  onSpinEnd={handleSpinEnd}
              />
          )}

          {!loading && items.length <= 1 && !error && (
              <ThemedText style={styles.centeredText}>
                Add at least two items to spin the wheel!
              </ThemedText>
          )}
        </ParallaxScrollView>

        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalContent}>
              <ThemedText type="subtitle">🎉 The Winner Is... 🎉</ThemedText>
              <ThemedText type="title" style={styles.winnerText}>
                {winner?.name}
              </ThemedText>
              <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <ThemedText style={styles.closeButtonText}>Awesome!</ThemedText>
              </Pressable>
            </ThemedView>
          </View>
        </Modal>
      </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    padding: 20,
    alignItems: 'center',
  },
  // NEW: Styles for the winner banner
  currentWinnerContainer: {
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
  currentWinnerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  timerText: {
    fontSize: 14,
    marginTop: 4,
    fontVariant: ['tabular-nums'], // keeps the timer from jumping around horizontally
  },
  errorContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
  },
  headerEmoji: {
    fontSize: 80,
    bottom: 10,
    left: 20,
    position: 'absolute',
  },
  centeredText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  winnerText: {
    marginVertical: 20,
    color: '#50E3C2',
  },
  closeButton: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: '#4A90E2',
    marginTop: 15,
    minWidth: 120,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});