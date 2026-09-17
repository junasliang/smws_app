import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { getWhisky } from "../../services/api";
import type { WhiskyDetail } from "../../types/whisky";

interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
}

function DetailRow({ label, value }: DetailRowProps) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

export default function WhiskyDetailScreen() {
  const params = useLocalSearchParams<{ caskNo?: string | string[] }>();
  const caskNo = Array.isArray(params.caskNo) ? params.caskNo[0] : params.caskNo;

  const [whisky, setWhisky] = useState<WhiskyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caskNo) {
      setError("缺少桶號。 ");
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      try {
        const data = await getWhisky(caskNo);
        if (active) {
          setWhisky(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "讀取酒款資料失敗。 ");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [caskNo]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>讀取酒款資料…</Text>
      </View>
    );
  }

  if (error || !whisky) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error?.trim() ?? "找不到酒款。"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.caskNo}>{whisky.cask_no}</Text>
      {whisky.name_zh ? <Text style={styles.nameZh}>{whisky.name_zh}</Text> : null}
      {whisky.name_en ? <Text style={styles.nameEn}>{whisky.name_en}</Text> : null}

      <View style={styles.card}>
        <DetailRow label="ABV" value={whisky.abv !== null ? `${whisky.abv}%` : null} />
        <DetailRow label="年份" value={whisky.age_text} />
        <DetailRow label="產區" value={whisky.region} />
        <DetailRow label="風味" value={whisky.flavor_profile} />
        <DetailRow label="蒸餾日期" value={whisky.distillation_date} />
        <DetailRow label="初始桶型" value={whisky.initial_cask} />
        <DetailRow label="熟成／換桶" value={whisky.finishing_cask} />
        <DetailRow label="系列" value={whisky.series} />
        <DetailRow
          label="價格"
          value={
            whisky.price_twd !== null
              ? `NT$ ${whisky.price_twd.toLocaleString("zh-TW")}`
              : null
          }
        />
        <DetailRow
          label="狀態"
          value={whisky.is_available === false ? "缺貨" : "可詢問"}
        />
      </View>

      {whisky.tasting_notes ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>品飲筆記</Text>
          <Text style={styles.notes}>{whisky.tasting_notes}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(whisky.source_url)}
        style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
      >
        <Text style={styles.sourceButtonText}>查看 SMWS 原始頁面</Text>
      </Pressable>
    </ScrollView>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    backgroundColor: "#f7f6f3",
  },
  loadingText: {
    color: "#666666",
  },
  error: {
    color: "#922d2d",
    textAlign: "center",
  },
  caskNo: {
    fontSize: 30,
    fontWeight: "900",
    color: "#171717",
  },
  nameZh: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: "#232323",
  },
  nameEn: {
    marginTop: 5,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
  },
  card: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e2db",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e4e4",
  },
  rowLabel: {
    width: 90,
    fontSize: 14,
    color: "#777777",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#242424",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#242424",
  },
  notes: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: "#4b4b4b",
  },
  sourceButton: {
    minHeight: 50,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#171717",
  },
  sourceButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.72,
  },
});
