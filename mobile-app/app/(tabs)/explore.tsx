// mobile-app/app/(tabs)/explore.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Pressable, ScrollView, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface WheelItem {
    id: string;
    name: string;
    active: boolean;
}

interface WinnerRequest {
    id: string;
    requesterUsername: string;
    wheelItemName: string;
    upvotes: number;
    downvotes: number;
    votedUsers: string[];
    status: string;
    createdAt: string;
}

export default function RequestPanelScreen() {
    const [username, setUsername] = useState<string | null>(null);
    const [wheelItems, setWheelItems] = useState<WheelItem[]>([]);
    const [requests, setRequests] = useState<WinnerRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch data whenever this tab comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        setLoading(true);
        try {
            const storedUser = await SecureStore.getItemAsync('userToken');
            setUsername(storedUser);

            const API_URL = process.env.EXPO_PUBLIC_API_URL;

            const [itemsRes, reqRes] = await Promise.all([
                fetch(`${API_URL}/api/wheel-items`),
                fetch(`${API_URL}/api/requests`)
            ]);

            if (itemsRes.ok) setWheelItems(await itemsRes.json());
            if (reqRes.ok) {
                const reqData: WinnerRequest[] = await reqRes.json();
                // Sort newest first
                reqData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setRequests(reqData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequest = async (item: WheelItem) => {
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterUsername: username,
                    wheelItemId: item.id,
                    wheelItemName: item.name
                }),
            });

            if (response.ok) {
                Alert.alert("Success", "Request submitted for voting!");
                fetchData(); // Refresh list
            }
        } catch (e) {
            Alert.alert("Error", "Could not submit request.");
        }
    };

    const handleVote = async (requestId: string, voteType: 'UP' | 'DOWN') => {
        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/requests/${requestId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, voteType }),
            });

            if (response.ok) {
                fetchData(); // Refresh list to get updated votes and status
            } else {
                const err = await response.text();
                Alert.alert("Vote Failed", err);
            }
        } catch (e) {
            Alert.alert("Error", "Could not submit vote.");
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#4A90E2" /></View>;
    }

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const historyRequests = requests.filter(r => r.status !== 'PENDING');

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            <ThemedText type="title" style={{ marginBottom: 20 }}>Requests Panel</ThemedText>

            {/* --- CREATE NEW REQUEST SECTION --- */}
            <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Make a Request</ThemedText>
                <ThemedText style={{ marginBottom: 15, fontSize: 14 }}>
                    Who should be assigned as the winner without spinning?
                </ThemedText>
                <View style={styles.chipContainer}>
                    {wheelItems.filter(i => i.active).map(item => (
                        <Pressable key={item.id} style={styles.chip} onPress={() => handleCreateRequest(item)}>
                            <ThemedText style={styles.chipText}>Request: {item.name}</ThemedText>
                        </Pressable>
                    ))}
                </View>
            </ThemedView>

            {/* --- ACTIVE VOTES SECTION --- */}
            <ThemedText type="subtitle" style={styles.sectionTitle}>Active Votes</ThemedText>
            {pendingRequests.length === 0 ? (
                <ThemedText style={styles.emptyText}>No pending requests.</ThemedText>
            ) : (
                pendingRequests.map(req => {
                    const hasVoted = req.votedUsers.includes(username || '');
                    return (
                        <ThemedView key={req.id} style={styles.card}>
                            <ThemedText type="defaultSemiBold" style={{ color: '#4A90E2' }}>
                                {req.requesterUsername} requested for {req.wheelItemName}
                            </ThemedText>

                            <View style={styles.voteStats}>
                                <ThemedText>👍 {req.upvotes} Upvotes</ThemedText>
                                <ThemedText>👎 {req.downvotes} Downvotes</ThemedText>
                            </View>

                            {!hasVoted ? (
                                <View style={styles.voteButtons}>
                                    <Pressable style={[styles.voteBtn, { backgroundColor: '#50E3C2' }]} onPress={() => handleVote(req.id, 'UP')}>
                                        <ThemedText style={styles.btnText}>Upvote</ThemedText>
                                    </Pressable>
                                    <Pressable style={[styles.voteBtn, { backgroundColor: '#ff4444' }]} onPress={() => handleVote(req.id, 'DOWN')}>
                                        <ThemedText style={styles.btnText}>Downvote</ThemedText>
                                    </Pressable>
                                </View>
                            ) : (
                                <ThemedText style={{ color: '#888', marginTop: 10, textAlign: 'center' }}>You have already voted.</ThemedText>
                            )}
                        </ThemedView>
                    );
                })
            )}

            {/* --- HISTORY SECTION --- */}
            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 30 }]}>History</ThemedText>
            {historyRequests.length === 0 ? (
                <ThemedText style={styles.emptyText}>No history yet.</ThemedText>
            ) : (
                historyRequests.map(req => (
                    <ThemedView key={req.id} style={[styles.card, { opacity: 0.8 }]}>
                        <ThemedText>
                            <ThemedText type="defaultSemiBold">{req.requesterUsername}</ThemedText> requested <ThemedText type="defaultSemiBold">{req.wheelItemName}</ThemedText>
                        </ThemedText>
                        <View style={[styles.statusBadge, { backgroundColor: req.status === 'APPROVED' ? 'rgba(80, 227, 194, 0.2)' : 'rgba(255, 68, 68, 0.2)' }]}>
                            <ThemedText style={{ color: req.status === 'APPROVED' ? '#50E3C2' : '#ff4444', fontWeight: 'bold' }}>
                                {req.status}
                            </ThemedText>
                        </View>
                    </ThemedView>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { marginTop: 20, marginBottom: 10 },
    card: {
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        backgroundColor: '#4A90E2',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    chipText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    emptyText: { color: '#888', fontStyle: 'italic' },
    voteStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)'
    },
    voteButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    voteBtn: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    btnText: { color: 'white', fontWeight: 'bold' },
    statusBadge: {
        alignSelf: 'flex-start',
        marginTop: 10,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    }
});