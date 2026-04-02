// mobile-app/components/RequestPanel.tsx

import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Alert, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export interface WheelItem {
    id: string;
    name: string;
    occurrences: number;
    active: boolean;
}

export interface WinnerRequest {
    id: string;
    requesterUsername: string;
    message?: string;
    upvotes: number;
    downvotes: number;
    votedUsers: string[];
    status: string;
    createdAt: string;
}

interface RequestPanelProps {
    items: WheelItem[];
    requests: WinnerRequest[];
    username: string | null;
    onRefresh: () => void;
}

export default function RequestPanel({ items, requests, username, onRefresh }: RequestPanelProps) {
    const [message, setMessage] = useState('');

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const historyRequests = requests.filter(r => r.status !== 'PENDING');

    // 1. Check if they already have an active request
    const hasPendingRequest = pendingRequests.some(r => r.requesterUsername === username);

    // 2. Find the wheel item that matches their username
    const myWheelItem = items.find(i => i.name.toLowerCase() === (username || '').toLowerCase());

    const handleCreateRequest = async () => {
        if (!myWheelItem) return;

        try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${API_URL}/api/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterUsername: username,
                    wheelItemId: myWheelItem.id,
                    message: message // Only sending these 3 things now!
                }),
            });

            if (response.ok) {
                Alert.alert("Success", "Request submitted for voting!");
                setMessage(''); // Clear the input
                onRefresh();
            } else {
                const err = await response.text();
                Alert.alert("Request Failed", err);
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
                onRefresh();
            } else {
                const err = await response.text();
                Alert.alert("Vote Failed", err);
            }
        } catch (e) {
            Alert.alert("Error", "Could not submit vote.");
        }
    };

    return (
        <View style={styles.requestPanelContainer}>
            <View style={styles.divider} />

            <ThemedText type="title" style={{ marginBottom: 20, textAlign: 'center' }}>Requests Panel</ThemedText>

            {/* === CREATE REQUEST === */}
            <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Volunteer to Win</ThemedText>

                {hasPendingRequest ? (
                    <ThemedText style={{ color: '#50E3C2', fontStyle: 'italic', marginTop: 5 }}>
                        You already have an active request pending!
                    </ThemedText>
                ) : !myWheelItem ? (
                    <ThemedText style={{ color: '#ff4444', fontStyle: 'italic', marginTop: 5 }}>
                        You must add your username "{username}" to the wheel before you can make a request.
                    </ThemedText>
                ) : (
                    <View>
                        <ThemedText style={{ marginBottom: 10, fontSize: 14 }}>
                            Tell everyone why you should be the winner:
                        </ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="I'll do the chores today! (Optional)"
                            placeholderTextColor="#888"
                            value={message}
                            onChangeText={setMessage}
                            maxLength={100}
                        />
                        <Pressable style={[styles.chip, { alignSelf: 'flex-start' }]} onPress={handleCreateRequest}>
                            <ThemedText style={styles.chipText}>Submit Request</ThemedText>
                        </Pressable>
                    </View>
                )}
            </ThemedView>

            {/* === ACTIVE VOTES === */}
            <ThemedText type="subtitle" style={styles.sectionTitle}>Active Votes</ThemedText>
            {pendingRequests.length === 0 ? (
                <ThemedText style={styles.emptyText}>No pending requests.</ThemedText>
            ) : (
                pendingRequests.map(req => {
                    const hasVoted = req.votedUsers.includes(username || '');
                    return (
                        <ThemedView key={req.id} style={styles.card}>
                            <ThemedText type="defaultSemiBold" style={{ color: '#4A90E2' }}>
                                {req.requesterUsername} requested to be the winner
                            </ThemedText>

                            {/* Display the message if they wrote one */}
                            {req.message ? (
                                <ThemedText style={styles.messageText}>"{req.message}"</ThemedText>
                            ) : null}

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

            {/* === HISTORY === */}
            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 30 }]}>History</ThemedText>
            {historyRequests.length === 0 ? (
                <ThemedText style={styles.emptyText}>No history yet.</ThemedText>
            ) : (
                historyRequests.map(req => (
                    <ThemedView key={req.id} style={[styles.card, { opacity: 0.8 }]}>
                        <ThemedText>
                            <ThemedText type="defaultSemiBold">{req.requesterUsername}</ThemedText> requested to be the winner
                        </ThemedText>
                        {req.message ? (
                            <ThemedText style={[styles.messageText, { color: '#888' }]}>"{req.message}"</ThemedText>
                        ) : null}
                        <View style={[styles.statusBadge, { backgroundColor: req.status === 'APPROVED' ? 'rgba(80, 227, 194, 0.2)' : 'rgba(255, 68, 68, 0.2)' }]}>
                            <ThemedText style={{ color: req.status === 'APPROVED' ? '#50E3C2' : '#ff4444', fontWeight: 'bold' }}>
                                {req.status}
                            </ThemedText>
                        </View>
                    </ThemedView>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    requestPanelContainer: { paddingHorizontal: 20, paddingBottom: 60 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 30 },
    sectionTitle: { marginTop: 20, marginBottom: 10 },
    card: {
        padding: 15, borderRadius: 12, marginBottom: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    // NEW: TextInput style
    input: {
        height: 45, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8, paddingHorizontal: 15, color: '#fff',
        marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.2)',
    },
    // NEW: Message text style
    messageText: { fontStyle: 'italic', color: '#ccc', marginTop: 5, marginBottom: 5 },
    chip: { backgroundColor: '#4A90E2', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
    chipText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    emptyText: { color: '#888', fontStyle: 'italic' },
    voteStats: {
        flexDirection: 'row', justifyContent: 'space-around', marginTop: 15,
        paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)'
    },
    voteButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    voteBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold' },
    statusBadge: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 }
});