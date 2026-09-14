// components/input/TextArea.jsx
import React, { useState } from "react";
import { View, Pressable, FlatList, Dimensions, Image } from "react-native";
import { colors } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';
import AppText from '@/components/ui/appText'; 

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.7;
const ITEM_SPACING = 12;
const IMAGE_HEIGHT = 228;

export default function MediaInput({
  photos = [],
  error,
  disabled,
  onPress,
  style
}) {

    const [focused, setFocused] = useState(false);
    
    const borderStyle = () => {
        if (disabled) return colors.semantic.input.border.disabled;
        if (error) return colors.semantic.input.border.error;
        if (focused) return colors.semantic.input.border.focused;
        return colors.semantic.input.border.normal;
    };

    const border = borderStyle();

  return (
    <View>
    {photos.length === 0 ? (
        <Pressable
            onPress={onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            <View 
                style={[
                    {
                        width: '100%', 
                        aspectRatio: 1, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderWidth: border.width, 
                        borderColor: border.color, 
                        borderRadius: 10,
                    }, style 
                    ]}
            >
                <View style={{ flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Feather name="plus" size={20} color={colors.semantic.text.primary} />
                    <AppText variant='body-md'>Upload File</AppText>
                </View>
                <AppText variant='body-xsm' style={{ position: 'absolute', bottom: 16, textAlign: 'center' }}>
                    ✶ Max size: 10MB
                </AppText>
            </View>
        </Pressable>
    ) : (
        <FlatList
            data={photos}
            horizontal
            pagingEnabled
            snapToInterval={ITEM_WIDTH + ITEM_SPACING}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, index) => `${uri}-${index}`}
            contentContainerStyle={{
                paddingHorizontal: 0,
            }}
            renderItem={({ item }) => (
                <View style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}>
                    <Image
                        source={{ uri: item}}
                        style={{
                            width: '100%',
                            aspectRatio: 1,
                            borderRadius: 8,
                        }}
                        contentFit="cover"
                    />
                </View>
            )}
        />
        )
    }
    </View>
  );
}

