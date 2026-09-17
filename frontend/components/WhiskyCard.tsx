import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WhiskySummary } from "../types/whisky";

interface Props {
  whisky: WhiskySummary;
  onPress: () => void;
}

function formatPrice(price: number | null): string {
  if (price === null) {
    return "價格未提供";
  }

  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

export function WhiskyCard({ whisky, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.caskNo}>{whisky.cask_no}</Text>
        <Text
          style={[
            styles.availability,
            whisky.is_available === false && styles.unavailable,
          ]}
        >
          {whisky.is_available === false ? "缺貨" : "可詢問"}
        </Text>
      </View>

      {whisky.name_zh ? <Text style={styles.nameZh}>{whisky.name_zh}</Text> : null}
      {whisky.name_en ? <Text style={styles.nameEn}>{whisky.name_en}</Text> : null}

      <View style={styles.metaRow}>
        {whisky.age_text ? <Text style={styles.meta}>{whisky.age_text} 年</Text> : null}
        {whisky.abv !== null ? <Text style={styles.meta}>{whisky.abv}% ABV</Text> : null}
        {whisky.region ? <Text style={styles.meta}>{whisky.region}</Text> : null}
      </View>

      <Text style={styles.price}>{formatPrice(whisky.price_twd)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  pressed: {
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  caskNo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#191919",
  },
  availability: {
    fontSize: 13,
    fontWeight: "600",
    color: "#246b3b",
  },
  unavailable: {
    color: "#9c2f2f",
  },
  nameZh: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "600",
    color: "#222222",
  },
  nameEn: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#666666",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  meta: {
    borderRadius: 999,
    backgroundColor: "#f1f1f1",
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    color: "#444444",
  },
  price: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#191919",
  },
});
