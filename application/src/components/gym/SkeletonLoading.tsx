import { StyleSheet, View } from "react-native";

export function SkeletonList({ theme }: any) {
  return (
    <View style={styles.gymList}>
      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View
            style={[styles.skeletonPhoto, { backgroundColor: theme.skeleton }]}
          />
          <View style={styles.skeletonInfo}>
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: theme.skeleton, width: "60%" },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: theme.skeleton, width: "42%" },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gymList: { gap: 22 },
  skeletonCard: {
    height: 290,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  skeletonPhoto: { height: 182 },
  skeletonInfo: { padding: 18, gap: 16 },
  skeletonLine: { height: 18, borderRadius: 6 },
});
