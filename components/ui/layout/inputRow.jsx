// components/layout/InputRow.jsx

import { View, StyleSheet } from "react-native";
import React from "react";

export default function InputRow({ 
  isRow = true,
  children, 
  isLast = false, 
  style }) {
  return (

      <View style={[isRow ? styles.row : styles.column, isLast && styles.lastRow, style]}>
        {React.Children.map(children, (child) => (
          <View style={{ flex: 1 }}>{child}</View>
        ))}
      </View>

    
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    columnGap: 4,
  },
  column: {
    flexDirection: "column",
    rowGap: 8,
  },
  lastRow: {
    marginBottom: 0,
  },
  
});
