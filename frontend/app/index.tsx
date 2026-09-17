import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { WhiskyCard } from "../components/WhiskyCard";
import { searchWhiskies } from "../services/api";
import type { WhiskySummary } from "../types/whisky";

export default function HomeScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const lastIncomingQuery = useRef<string | null>(null);

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<WhiskySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError(null);

    try {
      const response = await searchWhiskies(trimmed);
      setItems(response.items);
      setSearched(true);
    } catch (searchError) {
      setItems([]);
      setSearched(true);
      setError(
        searchError instanceof Error ? searchError.message : "搜尋失敗，請稍後再試。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const incomingQuery = typeof params.q === "string" ? params.q.trim() : "";

    if (!incomingQuery || incomingQuery === lastIncomingQuery.current) {
      return;
    }

    lastIncomingQuery.current = incomingQuery;
    setQuery(incomingQuery);
    void runSearch(incomingQuery);
  }, [params.q, runSearch]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      data={items}
      keyExtractor={(item) => item.cask_no}
      renderItem={({ item }) => (
        <WhiskyCard
          whisky={item}
          onPress={() =>
            router.push({
              pathname: "/whisky/[caskNo]",
              params: { caskNo: item.cask_no },
            })
          }
        />
      )}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>搜尋 SMWS 酒款</Text>
          <Text style={styles.subtitle}>
            輸入桶號、中文名稱或英文名稱，例如 93.228、墨魚、Squid ink。
          </Text>

          <View style={styles.searchBox}>
            <TextInput
              accessibilityLabel="酒款搜尋"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              onSubmitEditing={() => void runSearch(query)}
              placeholder="93.228 / 酒款名稱"
              returnKeyType="search"
              style={styles.input}
              value={query}
            />

            <Pressable
              accessibilityRole="button"
              disabled={loading || !query.trim()}
              onPress={() => void runSearch(query)}
              style={({ pressed }) => [
                styles.searchButton,
                (loading || !query.trim()) && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.searchButtonText}>搜尋</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/camera")}
            style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
          >
            <Text style={styles.cameraButtonText}>開啟相機辨識酒款</Text>
          </Pressable>

          {loading ? (
            <View style={styles.messageBox}>
              <ActivityIndicator />
              <Text style={styles.messageText}>搜尋中…</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {searched && !loading && !error ? (
            <Text style={styles.resultCount}>找到 {items.length} 筆結果</Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        searched && !loading && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>沒有找到酒款</Text>
            <Text style={styles.emptyText}>可以改用桶號，或縮短酒款名稱再搜尋。</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f6f3",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#171717",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: "#646464",
  },
  searchBox: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9d7d1",
    backgroundColor: "#ffffff",
    fontSize: 16,
    color: "#171717",
  },
  searchButton: {
    minWidth: 76,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#171717",
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.45,
  },
  cameraButton: {
    marginTop: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#171717",
    backgroundColor: "#ffffff",
  },
  cameraButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#171717",
  },
  pressed: {
    opacity: 0.7,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  messageText: {
    color: "#555555",
  },
  error: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fde8e8",
    color: "#922d2d",
  },
  resultCount: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  emptyState: {
    paddingVertical: 34,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: "#777777",
  },
});
