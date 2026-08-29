import { View, Text, StyleSheet } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const login = () => {
  return (
    <SafeAreaView style={styles.bg}>
      <View>
        <Text style={styles.mainText}>BOLE ELITE</Text>
        <Text style={[styles.blured, { fontSize: 20, textAlign: "center" }]}>
          BEAST MODE: ACTIVATED
        </Text>
      </View>
      <View style={styles.bg2}>
        <Text style={styles.secondaryText}>Start Your Journey</Text>
        <Text style={styles.blured}>Professional-grade performance starts</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainText: {
    color: "#2664EB",
    fontWeight: "bold",
    fontSize: 40,
    textAlign: "center",
  },
  bg: {
    backgroundColor: "#0B1326",
    height: "100%",
    flex: 1,
    alignItems: "center",
  },
  secondaryText: {
    color: "#fff",
  },
  blured: {
    color: "#ACAFC1",
  },
  bg2: {
    backgroundColor: "#131B2E",
    height: "85%",
    width: "90%",
    borderRadius: 10,
  },
});

export default login;
