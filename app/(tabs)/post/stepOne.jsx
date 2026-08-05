import { useState, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import PillGroup from '@/components/ui/pill/pillGroup';
import AppText from '@/components/ui/appText';
import FormField from '@/components/ui/form/formField';
import InputRow from '@/components/ui/layout/inputRow';
import { colors } from '@/constants/colors';
import TextField from '@/components/ui/input/textField';
import TextArea from '@/components/ui/input/textArea';
import AppButton from '@/components/ui/appButton';
import AppDrawer from '@/components/ui/drawer/AppDrawer';
import Dropdown from '@/components/ui/input/dropdown';
import DisplayInput from '@/components/ui/input/displayInput';
import { useListingDraft } from '@/context/ListingDraftContext';
import { usePostFlowExit } from '@/hooks/use-post-flow-exit';
import { geocodeAddress } from '@/lib/geo/geocode';

const DEPOSIT_INCREMENT = 100;
const DEPOSIT_TBD_VALUE = 'TBD';
const TBD_DEPOSIT_OPTION = { label: DEPOSIT_TBD_VALUE, value: DEPOSIT_TBD_VALUE };

{/* dropdown options */}
const ROOMTYPE_OPTIONS = [
    { label: 'Private Room', value: 'private' },
    { label: 'Shared room', value: 'shared' },
];

const FURNISHEDTYPE_OPTIONS = [
    { label: 'Furnished', value: 'furnished' },
    { label: 'Unfurnished', value: 'unfurnished' },
];

const KEYDETAIL_OPTIONS = [
    { label: 'Wi-Fi', value: 'wifi' },
    { label: 'Laundry in building', value: 'laundry' },
    { label: 'Kitchen access', value: 'kitchen-access' },
    { label: 'Pet friendly', value: 'pet-friendly' },
    { label: 'Parking', value: 'parking' },
    { label: 'Shared Bathroom', value: 'shared-bathroom' },
    { label: 'Gym', value: 'gym' },
    { label: 'Swimming Pool', value: 'swimming-pool' },
    { label: 'Sauna', value: 'sauna' },
];

const LOOKINGFOR_OPTIONS = [
    { label: 'Man', value: 'man' },
    { label: 'Woman', value: 'woman' },
    { label: 'Non-binary', value: 'non-binary' },
    { label: 'Open to any', value: 'open-to-any' },
    { label: 'Clean', value: 'clean' },
    { label: 'Responsible', value: 'responsible' },
    { label: 'Pet-friendly', value: 'pet-friendly' },
    { label: 'Quiet at night', value: 'quiet-at-night' },
    { label: 'Early schedule', value: 'early-schedule' },
    { label: 'Non-smoker', value: 'non-smoker' },
];

{/* utility functions */}
const formatCurrency = (amount) => `$${Number(amount).toLocaleString()}`;

const getRoomTypeLabel = (value) => (
    ROOMTYPE_OPTIONS.find((item) => item.value === value)?.label ?? value
);
const getFurnishedTypeLabel = (value) => (
    FURNISHEDTYPE_OPTIONS.find((item) => item.value === value)?.label ?? value
);
const getKeyDetailLabel = (value) => (
    KEYDETAIL_OPTIONS.find((item) => item.value === value)?.label ?? value
);
const getLookingForLabel = (value) => (
    LOOKINGFOR_OPTIONS.find((item) => item.value === value)?.label ?? value
);

const normalizeAddressPart = (value) => value?.trim?.() ?? '';

const getAddressComponent = (components, type, name = 'long_name') => (
    components.find((component) => component.types.includes(type))?.[name] ?? ''
);

const getAddressParts = (components) => {
    const streetNumber = getAddressComponent(components, 'street_number');
    const route = getAddressComponent(components, 'route');

    return {
        street: [streetNumber, route].filter(Boolean).join(' '),
        city:
            getAddressComponent(components, 'locality') ||
            getAddressComponent(components, 'postal_town') ||
            getAddressComponent(components, 'sublocality') ||
            getAddressComponent(components, 'administrative_area_level_2'),
        province: getAddressComponent(components, 'administrative_area_level_1', 'short_name'),
        postalCode: getAddressComponent(components, 'postal_code'),
        country: getAddressComponent(components, 'country', 'short_name'),
    };
};

const createDepositOptions = (priceValue) => {
    const maxDeposit = Number(priceValue);

    if (!Number.isFinite(maxDeposit) || maxDeposit <= 0) {
        return [TBD_DEPOSIT_OPTION, { label: '$0', value: '0' }];
    }

    const highestIncrement = Math.floor(maxDeposit / DEPOSIT_INCREMENT) * DEPOSIT_INCREMENT;
    const amounts = [];

    for (let amount = 0; amount <= highestIncrement; amount += DEPOSIT_INCREMENT) {
        amounts.push(amount);
    }

    if (highestIncrement !== maxDeposit) {
        amounts.push(maxDeposit);
    }

    return [TBD_DEPOSIT_OPTION, ...amounts.map((amount) => ({
        label: formatCurrency(amount),
        value: String(amount),
    }))];
};

{/* main component */}
export default function StepOne() {
    const { draft, setFields } = useListingDraft();
    const { confirmExit } = usePostFlowExit();
    // Initialize from the shared draft so going back/forward (and "Edit Listing") keeps values.
    const [roomTitle, setRoomTitle] = useState(draft.roomTitle || null);
    const [price, setPrice] = useState(draft.price || null);
    const [street, setStreet] = useState(draft.street || null);
    const [additionalAddress, setAdditionalAddress] = useState(draft.additionalAddress || null);
    const [city, setCity] = useState(draft.city || null);
    const [province, setProvince] = useState(draft.province || null);
    const [postalCode, setPostalCode] = useState(draft.postalCode || null);
    // One message per field so each FormField explains its own problem.
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [, setPlaceId] = useState(null);
    const [latitude, setLatitude] = useState(draft.latitude ?? null);
    const [longitude, setLongitude] = useState(draft.longitude ?? null);
    const [leaseType, setLeaseType] = useState(draft.leaseType || '');
    const [deposit, setDeposit] = useState(draft.deposit || '');
    const [roomType, setRoomType] = useState(draft.roomType || '');
    const [furnishedType, setFurnishedType] = useState(draft.furnishedType || '');
    const [keyDetail, setKeyDetail] = useState(draft.keyDetail ?? []);
    const [lookingFor, setLookingFor] = useState(draft.lookingFor ?? []);
    const [description, setDescription] = useState(draft.description ?? '');
    const [availableMonth, setAvailableMonth] = useState(draft.availableMonth ?? null);
    const [availableDay, setAvailableDay] = useState(draft.availableDay ?? null);
    const [availableYear, setAvailableYear] = useState(draft.availableYear ?? null);
    const [minimumStay, setMinimumStay] = useState(draft.minimumStay || '');
    const [isUtilityIncluded, setIsUtilityIncluded] = useState(draft.isUtilityIncluded ?? true);
    const [draftIsUtilityIncluded, setDraftIsUtilityIncluded] = useState(true);
    const availableMonthDrawerRef = useRef(null);
    const availableDayDrawerRef = useRef(null);
    const availableYearDrawerRef = useRef(null);
    const depositDrawerRef = useRef(null);
    const keyDetailDrawerRef = useRef(null);
    const lookingForDrawerRef = useRef(null);
    const utilitiesDrawerRef = useRef(null);

    const depositOptions = useMemo(() => createDepositOptions(price), [price]);

    const clearFieldError = (field) => {
        setErrors((current) => (current[field] ? { ...current, [field]: null } : current));
    };

    {/* memoized selected labels for display inputs */}
    const selectedAboutRoomLabels = useMemo(
        () => [
            roomType && getRoomTypeLabel(roomType),
            furnishedType && getFurnishedTypeLabel(furnishedType),
            ...keyDetail.map(getKeyDetailLabel),
        ].filter(Boolean),
        [roomType, furnishedType, keyDetail]
    );
    const selectedLookingForLabels = useMemo(
        () => lookingFor.map(getLookingForLabel),
        [lookingFor]
    );
    {/* formatted price and deposit for display in text fields */}
    const formattedDeposit = deposit === DEPOSIT_TBD_VALUE
        ? DEPOSIT_TBD_VALUE
        : deposit
            ? formatCurrency(deposit)
            : '';
    const formattedPrice = price ? formatCurrency(price) : '';

    useEffect(() => {
        if (deposit === DEPOSIT_TBD_VALUE) {
            return;
        }

        const priceAmount = Number(price);
        const depositAmount = Number(deposit);

        if (deposit && Number.isFinite(priceAmount) && depositAmount > priceAmount) {
            setDeposit('');
        }
    }, [deposit, price]);

    // Tab bar visibility for post sub-screens is handled centrally in (tabs)/_layout.jsx.

    const openDepositDrawer = () => {
        // Default to the first option (TBD) so opening + closing (even via handle/backdrop) commits a value.
        if (!deposit) setDeposit(DEPOSIT_TBD_VALUE);
        clearFieldError('deposit');
        depositDrawerRef.current?.snapToIndex(0);
    };

    const openUtilitiesDrawer = () => {
        setDraftIsUtilityIncluded(isUtilityIncluded);
        utilitiesDrawerRef.current?.snapToIndex(0);
    };

    const saveUtilities = () => {
        setIsUtilityIncluded(draftIsUtilityIncluded);
        utilitiesDrawerRef.current?.close();
    };

    {/* Google Places Autocomplete handlers */}
    const clearSelectedPlace = () => {
        setPlaceId(null);
        setLatitude(null);
        setLongitude(null);
    };

    const handlePlaceSelect = (data, details = null) => {
        const location = details?.geometry?.location;
        const addressParts = getAddressParts(details?.address_components ?? []);
        const nextStreet = addressParts.street || data.description;

        setStreet(nextStreet);
        setCity(addressParts.city);
        setProvince(addressParts.province);
        setPostalCode(addressParts.postalCode);
        setPlaceId(data.place_id);
        setLatitude(location?.lat ?? null);
        setLongitude(location?.lng ?? null);
        clearFieldError('address');

        // console.log('[StepOne] Google place selected', {
        //     description: data.description,
        //     placeId: data.place_id,
        //     addressParts,
        //     coordinates: {
        //         latitude: location?.lat ?? null,
        //         longitude: location?.lng ?? null,
        //     },
        //     rawData: data,
        //     rawDetails: details,
        // });
    };

    // Collects every problem at once so the renter sees all of them instead of one at a time.
    const validate = () => {
        const nextErrors = {};

        if (!normalizeAddressPart(roomTitle)) {
            nextErrors.roomTitle = 'Enter a room title.';
        }

        if (!normalizeAddressPart(street)) {
            nextErrors.address = 'Enter the street address.';
        } else if (!normalizeAddressPart(city)) {
            nextErrors.address = 'Enter the city or town.';
        } else if (!normalizeAddressPart(province)) {
            nextErrors.address = 'Enter the state, province, or region.';
        }

        if (!availableMonth || !availableDay || !availableYear) {
            nextErrors.availableFrom = 'Select the month, day, and year.';
        }

        if (!leaseType) {
            nextErrors.leaseType = 'Choose one of the options.';
        }

        if (!price) {
            nextErrors.price = 'Enter the monthly rent.';
        } else if (Number(price) <= 0) {
            nextErrors.price = 'Monthly rent must be more than $0.';
        }

        if (!deposit) {
            nextErrors.deposit = 'Choose a deposit amount, or pick TBD if it is not decided yet.';
        }

        if (!minimumStay) {
            nextErrors.minimumStay = 'Enter the shortest stay in months.';
        } else if (!Number.isFinite(Number(minimumStay)) || Number(minimumStay) < 1) {
            nextErrors.minimumStay = 'Minimum stay must be at least 1 month.';
        }

        if (!roomType || !furnishedType) {
            nextErrors.aboutRoom = 'Select the room type.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const continueToStepTwo = async () => {
        // Coordinates come from Google Places autocomplete when a suggestion is tapped;
        // otherwise we geocode the typed address as a fallback.
        if (!validate()) return;

        setSubmitting(true);
        let lat = Number.isFinite(latitude) ? latitude : null;
        let lng = Number.isFinite(longitude) ? longitude : null;
        if (lat === null || lng === null) {
            const fullAddress = [
                normalizeAddressPart(street),
                normalizeAddressPart(city),
                `${normalizeAddressPart(province)} ${normalizeAddressPart(postalCode)}`.trim(),
            ].filter(Boolean).join(', ');
            const geocoded = await geocodeAddress(fullAddress);
            if (geocoded) {
                lat = geocoded.latitude;
                lng = geocoded.longitude;
                setLatitude(lat);
                setLongitude(lng);
            }
        }
        setSubmitting(false);

        setFields({
            roomTitle: normalizeAddressPart(roomTitle),
            price,
            street: normalizeAddressPart(street),
            additionalAddress: normalizeAddressPart(additionalAddress),
            city: normalizeAddressPart(city),
            province: normalizeAddressPart(province),
            postalCode: normalizeAddressPart(postalCode),
            latitude: lat,
            longitude: lng,
            leaseType,
            deposit,
            roomType,
            furnishedType,
            keyDetail,
            lookingFor,
            description,
            availableMonth,
            availableDay,
            availableYear,
            minimumStay,
            isUtilityIncluded,
        });

        setErrors({});
        router.push('/post/stepTwo');
    };

  return (
    <View style={{ flex: 1, overflow: 'visible' }}>
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <KeyboardAwareScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={-50}
        >
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <AppText variant='headline-md' color='primary'>Step 1</AppText>
                        <AppText variant='body-md' color='primary'>Share key details about your room</AppText>
                    </View>
                    <View style={styles.contentContainer}>
                        <FormField label="Room Title" error={errors.roomTitle}>
                            <TextField
                                value={roomTitle}
                                placeholder="e.g., Spacious Master Room in Downtown NYC"
                                placeholderTextColor={colors.semantic.input.textDisabled}
                                error={!!errors.roomTitle}
                                onChangeText={(text) => {
                                    setRoomTitle(text);
                                    clearFieldError('roomTitle');
                                }}
                            />
                        </FormField>
                        <FormField label="Address" error={errors.address}>
                            <InputRow isRow={false} style={styles.addressAutocompleteRow}>
                                <GooglePlacesAutocomplete
                                    placeholder="Street"
                                    fetchDetails
                                    debounce={300}
                                    minLength={2}
                                    enablePoweredByContainer={false}
                                    keyboardShouldPersistTaps="always"
                                    listViewDisplayed="auto"
                                    disableScroll
                                    query={{
                                        key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
                                        language: 'en',
                                        components: 'country:ca|country:us',
                                    }}
                                    textInputProps={{
                                        value: street ?? '',
                                        placeholderTextColor: colors.semantic.input.textDisabled,
                                        onChangeText: (text) => {
                                            setStreet(text);
                                            clearSelectedPlace();
                                            clearFieldError('address');
                                        },
                                        accessibilityLabel: 'Street address',
                                    }}
                                    onPress={handlePlaceSelect}
                                    // onFail={(placesError) => {
                                    //     console.log('[StepOne] Google Places autocomplete failed', placesError);
                                    //     setErrors((current) => ({ ...current, address: 'Address lookup failed. Please try again.' }));
                                    // }}
                                    onNotFound={() => {
                                        setErrors((current) => ({
                                            ...current,
                                            address: 'No matching address found. Try a more specific address.',
                                        }));
                                    }}
                                    styles={{
                                        container: styles.placesContainer,
                                        textInputContainer: styles.placesTextInputContainer,
                                        textInput: styles.placesTextInput,
                                        listView: styles.placesList,
                                        row: styles.placesRow,
                                        separator: styles.placesSeparator,
                                        description: styles.placesDescription,
                                        predefinedPlacesDescription: styles.placesDescription,
                                    }}
                                />
                                <TextField
                                    value={additionalAddress}
                                    placeholder="Additional Address (e.g., Apt, Suite)"
                                    placeholderTextColor={colors.semantic.input.textDisabled}
                                    onChangeText={setAdditionalAddress}
                                />
                                <TextField
                                    value={city}
                                    placeholder="City or Town"
                                    placeholderTextColor={colors.semantic.input.textDisabled}
                                    onChangeText={(text) => {
                                        setCity(text);
                                        clearFieldError('address');
                                    }}
                                />
                                <TextField
                                    value={province}
                                    placeholder="State, Province, or Region"
                                    placeholderTextColor={colors.semantic.input.textDisabled}
                                    onChangeText={(text) => {
                                        setProvince(text);
                                        clearFieldError('address');
                                    }}
                                />
                                <TextField
                                    value={postalCode}
                                    placeholder="Postal or ZIP Code"
                                    placeholderTextColor={colors.semantic.input.textDisabled}
                                    onChangeText={setPostalCode}
                                />
                            </InputRow>
                        </FormField>
                        <FormField label="Available From" error={errors.availableFrom}>
                            <InputRow>
                                <DisplayInput
                                    value={availableMonth}
                                    placeholder="Month"
                                    placeholderTextColor={colors.semantic.input.textDisabled}
                                    showSoftInputOnFocus={false}
                                    onPress={() => {
                                        if (!availableMonth) setAvailableMonth('Jan');
                                        clearFieldError('availableFrom');
                                        availableMonthDrawerRef.current?.snapToIndex(0);
                                    }}
                                />
                                <DisplayInput
                                    value={availableDay}
                                    placeholder="Day"
                                    placeholderTextColor={colors.semantic.input.textDisabled}
                                    showSoftInputOnFocus={false}
                                    onPress={() => {
                                        if (!availableDay) setAvailableDay('1');
                                        clearFieldError('availableFrom');
                                        availableDayDrawerRef.current?.snapToIndex(0);
                                    }}
                                />
                                <DisplayInput
                                    value={availableYear}
                                    placeholder="Year"
                                    placeholderTextColor={colors.semantic.input.textDisabled}
                                    showSoftInputOnFocus={false}
                                    onPress={() => {
                                        if (!availableYear) setAvailableYear('2026');
                                        clearFieldError('availableFrom');
                                        availableYearDrawerRef.current?.snapToIndex(0);
                                    }}
                                />
                            </InputRow>
                        </FormField>
                        <FormField label="Lease Type" error={errors.leaseType}>
                            <PillGroup
                                items={[
                                    { label: "Month-to-month", value: "month-to-month" },
                                    { label: "Fixed-term", value: "fixed-term" },
                                ]}
                                value={leaseType}
                                onChange={(value) => {
                                    setLeaseType(value);
                                    clearFieldError('leaseType');
                                }}
                                isMulti={false}
                            />
                        </FormField>
                        <FormField label="Monthly Rent" error={errors.price}>
                            <TextField
                                value={formattedPrice}
                                placeholder="Enter the rent (USD)"
                                placeholderTextColor={colors.semantic.input.textDisabled}
                                error={!!errors.price}
                                onChangeText={(text) => {
                                    const numbersOnly = text.replace(/[^0-9]/g, '');
                                    setPrice(numbersOnly);
                                    clearFieldError('price');
                                }}
                                keyboardType="number-pad"
                            />
                        </FormField>
                        <FormField label="Deposit" error={errors.deposit}>
                            <DisplayInput
                                value={formattedDeposit}
                                placeholder="Choose the deposit (USD)"
                                placeholderTextColor={colors.semantic.input.textDisabled}
                                showSoftInputOnFocus={false}
                                rightIcon={<Feather name="chevron-down" size={22} color={colors.semantic.text.primary} />}
                                onPress={openDepositDrawer}
                            />
                        </FormField>
                        <FormField label="Utilities">
                            <DisplayInput
                                value={isUtilityIncluded ? 'Included' : 'Not Included'}
                                placeholder="Select Options"
                                placeholderTextColor={colors.semantic.input.textDisabled}
                                showSoftInputOnFocus={false}
                                onPress={openUtilitiesDrawer}
                                rightIcon={<Feather name="chevron-down" size={22} color={colors.semantic.text.primary} />}
                            />
                        </FormField>
                        <FormField label="Minimum Stay" error={errors.minimumStay}>
                            <TextField
                                value={minimumStay}
                                placeholder="Enter minimum stay (months)"
                                placeholderTextColor={colors.semantic.input.textDisabled}
                                error={!!errors.minimumStay}
                                onChangeText={(text) => {
                                    setMinimumStay(text);
                                    clearFieldError('minimumStay');
                                }}
                                suffixText="months"
                                keyboardType="number-pad"
                            />
                        </FormField>
                        <FormField label="About Room & House" error={errors.aboutRoom}>
                            <DisplayInput
                                value={selectedAboutRoomLabels}
                                isMulti={true}
                                max={3}
                                placeholder="+"
                                onPress={() => keyDetailDrawerRef.current?.snapToIndex(0)}
                            />
                        </FormField>
                        <FormField label="Looking For" >
                            <DisplayInput
                                value={selectedLookingForLabels}
                                isMulti={true}
                                max={3}
                                placeholder="+"
                                onPress={() => lookingForDrawerRef.current?.snapToIndex(0)}
                            />
                        </FormField>
                        <FormField label="Description (Optional)">
                            <TextArea
                                value={description}
                                placeholder="Anything else roommates should know — vibe, house rules, neighborhood…"
                                maxLength={750}
                                onChangeText={setDescription}
                            />
                        </FormField>
                        <View style={styles.buttonContainer}>
                            <View style={{ flex: 1 }}>
                                <AppButton
                                    text="Cancel"
                                    type="secondary"
                                    onPress={confirmExit}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <AppButton
                                    text="Continue"
                                    loading={submitting}
                                    loadingLabel="Locating address"
                                    onPress={continueToStepTwo}
                                />
                            </View>
                        </View>
                    </View>
                </View>
        </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
        <AppDrawer
            ref={availableMonthDrawerRef}
            primaryAction={() => availableMonthDrawerRef.current?.close()}
        >
            <View style={styles.dropdownRow}>
                <Dropdown
                    value={availableMonth}
                    onChange={setAvailableMonth}
                    style={styles.dropdownItem}
                    options={[
                        { label: "Jan", value: "Jan" },
                        { label: "Feb", value: "Feb" },
                        { label: "Mar", value: "Mar" },
                        { label: "Apr", value: "Apr" },
                        { label: "May", value: "May" },
                        { label: "Jun", value: "Jun" },
                        { label: "Jul", value: "Jul" },
                        { label: "Aug", value: "Aug" },
                        { label: "Sep", value: "Sep" },
                        { label: "Oct", value: "Oct" },
                        { label: "Nov", value: "Nov" },
                        { label: "Dec", value: "Dec" },
                    ]}
                />
            </View>
        </AppDrawer>
        <AppDrawer
            ref={availableDayDrawerRef}
            primaryAction={() => availableDayDrawerRef.current?.close()}
        >
            <Dropdown
                value={availableDay}
                onChange={setAvailableDay}
                style={styles.dropdownItem}
                options={[
                    { label: "1", value: "1" },
                    { label: "2", value: "2" },
                    { label: "3", value: "3" },
                    { label: "4", value: "4" },
                    { label: "5", value: "5" },
                    { label: "6", value: "6" },
                    { label: "7", value: "7" },
                    { label: "8", value: "8" },
                    { label: "9", value: "9" },
                    { label: "10", value: "10" },
                    { label: "11", value: "11" },
                    { label: "12", value: "12" },
                    { label: "13", value: "13" },
                    { label: "14", value: "14" },
                    { label: "15", value: "15" },
                    { label: "16", value: "16" },
                    { label: "17", value: "17" },
                    { label: "18", value: "18" },
                    { label: "19", value: "19" },
                    { label: "20", value: "20" },
                    { label: "21", value: "21" },
                    { label: "22", value: "22" },
                    { label: "23", value: "23" },
                    { label: "24", value: "24" },
                    { label: "25", value: "25" },
                    { label: "26", value: "26" },
                    { label: "27", value: "27" },
                    { label: "28", value: "28" },
                    { label: "29", value: "29" },
                    { label: "30", value: "30" },
                    { label: "31", value: "31" },
                ]}
            />
        </AppDrawer>
        <AppDrawer
            ref={availableYearDrawerRef}
            primaryAction={() => availableYearDrawerRef.current?.close()}
        >
            <Dropdown
                value={availableYear}
                onChange={setAvailableYear}
                options={[
                    { label: "2026", value: "2026" },
                    { label: "2027", value: "2027" },
                    { label: "2028", value: "2028" },
                    { label: "2029", value: "2029" },
                    { label: "2030", value: "2030" },
                    { label: "2031", value: "2031" },
                    { label: "2032", value: "2032" },
                    { label: "2033", value: "2033" },
                    { label: "2034", value: "2034" },
                    { label: "2035", value: "2035" },
                    { label: "2036", value: "2036" },
                ]}
            />
        </AppDrawer>
        <AppDrawer
            ref={depositDrawerRef}
            primaryAction={() => depositDrawerRef.current?.close()}
        >
            <Dropdown
                value={deposit}
                onChange={setDeposit}
                options={depositOptions}
            />
        </AppDrawer>
        <AppDrawer
            ref={utilitiesDrawerRef}
            primaryAction={saveUtilities}
        >
            <Dropdown
                value={draftIsUtilityIncluded}
                onChange={setDraftIsUtilityIncluded}
                options={[
                    { label: "Included", value: true },
                    { label: "Not Included", value: false },
                ]}
            />
        </AppDrawer>
        <AppDrawer
            ref={keyDetailDrawerRef}
            title="Describe the room & home"
            description="Add key details about the room and home. Select all that apply"
            primaryAction={() => keyDetailDrawerRef.current?.close()}
        >
            <FormField label="Room Type">
                <PillGroup
                    items={ROOMTYPE_OPTIONS}
                    value={roomType}
                    onChange={(value) => {
                        setRoomType(value);
                        clearFieldError('aboutRoom');
                    }}
                    isMulti={false}
                />
            </FormField>
            <FormField label="Furnished Type">
                <PillGroup
                    items={FURNISHEDTYPE_OPTIONS}
                    value={furnishedType}
                    onChange={(value) => {
                        setFurnishedType(value);
                        clearFieldError('aboutRoom');
                    }}
                    isMulti={false}
                />
            </FormField>
            <FormField label="Amenities" lastField>
                <PillGroup
                    items={KEYDETAIL_OPTIONS}
                    value={keyDetail}
                    onChange={setKeyDetail}
                />
            </FormField>
        </AppDrawer>
        <AppDrawer
            ref={lookingForDrawerRef}
            title="Who would you like to live with?"
            description="Select all your preferred roommate traits"
            primaryAction={() => lookingForDrawerRef.current?.close()}
        >
            <PillGroup
                items={LOOKINGFOR_OPTIONS}
                value={lookingFor}
                onChange={setLookingFor}
            />
        </AppDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
  },
  buttonContainer:{
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  titleContainer:{
    alignItems: 'center',
    gap: 8,
  },
  contentContainer:{
    marginTop: 24,
  },
  addressAutocompleteRow: {
    zIndex: 20,
    elevation: 20,
  },
  placesContainer: {
    flex: 1,
    zIndex: 20,
  },
  placesTextInputContainer: {
    flexDirection: 'row',
  },
  placesTextInput: {
    width: '100%',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderColor: colors.semantic.input.border.normal.color,
    borderWidth: colors.semantic.input.border.normal.width,
    backgroundColor: colors.semantic.input.bg,
    color: colors.semantic.input.text,
    fontSize: 12,
    marginBottom: 0,
  },
  placesList: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: colors.semantic.bottomSheet.background,
    borderWidth: 1,
    borderColor: colors.base.gray800,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 30,
  },
  placesRow: {
    backgroundColor: colors.semantic.bottomSheet.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  placesSeparator: {
    height: 1,
    backgroundColor: colors.base.gray800,
  },
  placesDescription: {
    color: colors.semantic.text.primary,
    fontSize: 12,
  },
    dropdownRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
        width: '100%'
    },
    dropdownItem: {
        flex: 1,
        minWidth: 0,
    }
});
