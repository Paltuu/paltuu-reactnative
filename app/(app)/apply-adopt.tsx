import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePetStore } from '../../src/stores/petStore';
import { useAuthStore } from '../../src/stores/authStore';

export default function ApplyAdoptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pet_id, pet_name } = useLocalSearchParams();
  const { cities, fetchMetadata } = usePetStore();
  const { user } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    adopter_name: user?.name || "",
    city_id: "",
    contact_number: user?.phone_number || "",
    adopter_address: "",
    age_of_youngest_child: "",
    other_pets_details: "",
    other_pets_neutered: false,
    has_secure_outdoor_area: false,
    pet_sleep_location: "",
    pet_left_alone: "",
    additional_details: "",
    agree_to_terms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMetadata();
  }, []);

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.adopter_name) newErrors.adopter_name = "Name is required";
      if (!formData.city_id) newErrors.city_id = "City is required";
      if (!formData.contact_number) newErrors.contact_number = "Phone is required";
      if (!formData.adopter_address) newErrors.adopter_address = "Address is required";
    } else if (step === 3) {
      if (!formData.agree_to_terms) newErrors.agree_to_terms = "You must agree to the terms";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const payload = {
        pet_id: parseInt(pet_id as string),
        ...formData,
        city_id: parseInt(formData.city_id),
        contact_number: formData.contact_number.startsWith('+92') ? formData.contact_number : `+92${formData.contact_number}`
      };

      const { petApi } = require('../../src/api/pets');
      await petApi.applyForAdoption(payload);
      
      Alert.alert(
        "Success!",
        "Your adoption application has been submitted successfully.",
        [{ text: "OK", onPress: () => router.replace('/(app)/my-applications') }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View className="flex-row items-center justify-between px-10 mb-8">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <View className={`w-10 h-10 rounded-2xl items-center justify-center ${currentStep >= step ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-gray-100'}`}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={20} color="white" />
            ) : (
              <Text className={`font-black ${currentStep >= step ? 'text-white' : 'text-gray-400'}`}>{step}</Text>
            )}
          </View>
          {step < 3 && <View className={`flex-1 h-[2px] mx-2 ${currentStep > step ? 'bg-primary' : 'bg-gray-100'}`} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center px-5 py-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="close" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-gray-900">Apply to Adopt</Text>
          <Text className="text-xs text-primary font-bold uppercase tracking-widest">{pet_name || 'Pet'}</Text>
        </View>
      </View>

      <StepIndicator />

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {currentStep === 1 && (
          <View className="space-y-6">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-primary/10 rounded-3xl items-center justify-center mb-2">
                <Ionicons name="person" size={32} color="#a03048" />
              </View>
              <Text className="text-xl font-black text-gray-900">Personal Info</Text>
              <Text className="text-gray-400 font-bold">Let us know who you are</Text>
            </View>

            <View>
              <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Full Name *</Text>
              <TextInput
                value={formData.adopter_name}
                onChangeText={(text) => setFormData({...formData, adopter_name: text})}
                placeholder="Enter your name"
                className={`bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border ${errors.adopter_name ? 'border-red-500' : 'border-gray-100'}`}
              />
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1 mr-2">
                <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">City *</Text>
                <TouchableOpacity 
                  onPress={() => {
                    // Simple city selector alert for now
                    Alert.alert(
                      "Select City",
                      "",
                      cities.map(c => ({ text: c.city_name, onPress: () => setFormData({...formData, city_id: c.city_id.toString()}) }))
                    );
                  }}
                  className={`bg-gray-50 p-4 rounded-2xl border ${errors.city_id ? 'border-red-500' : 'border-gray-100'} flex-row justify-between items-center`}
                >
                  <Text className={`font-bold ${formData.city_id ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formData.city_id ? cities.find(c => c.city_id.toString() === formData.city_id)?.city_name : 'Select City'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Phone *</Text>
                <TextInput
                  value={formData.contact_number}
                  onChangeText={(text) => setFormData({...formData, contact_number: text})}
                  placeholder="3331234567"
                  keyboardType="phone-pad"
                  className={`bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border ${errors.contact_number ? 'border-red-500' : 'border-gray-100'}`}
                />
              </View>
            </View>

            <View>
              <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Area / Address *</Text>
              <TextInput
                value={formData.adopter_address}
                onChangeText={(text) => setFormData({...formData, adopter_address: text})}
                placeholder="Enter neighborhood or area"
                multiline
                className={`bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border min-h-[80px] ${errors.adopter_address ? 'border-red-500' : 'border-gray-100'}`}
              />
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View className="space-y-6">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-blue-50 rounded-3xl items-center justify-center mb-2">
                <Ionicons name="home" size={32} color="#4B9CD3" />
              </View>
              <Text className="text-xl font-black text-gray-900">Home & Family</Text>
              <Text className="text-gray-400 font-bold">About your household environment</Text>
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1 mr-2">
                <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Youngest Child Age</Text>
                <TextInput
                  value={formData.age_of_youngest_child}
                  onChangeText={(text) => setFormData({...formData, age_of_youngest_child: text})}
                  placeholder="Age"
                  keyboardType="number-pad"
                  className="bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border border-gray-100"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Sleep Location</Text>
                <TextInput
                  value={formData.pet_sleep_location}
                  onChangeText={(text) => setFormData({...formData, pet_sleep_location: text})}
                  placeholder="e.g. Indoors"
                  className="bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border border-gray-100"
                />
              </View>
            </View>

            <View>
              <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Other Pets Details</Text>
              <TextInput
                value={formData.other_pets_details}
                onChangeText={(text) => setFormData({...formData, other_pets_details: text})}
                placeholder="Details about existing pets"
                multiline
                className="bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border border-gray-100 min-h-[80px]"
              />
            </View>

            <View className="flex-row justify-between gap-4">
              <TouchableOpacity 
                onPress={() => setFormData({...formData, other_pets_neutered: !formData.other_pets_neutered})}
                className={`flex-1 p-4 rounded-2xl border-2 flex-row items-center justify-center space-x-2 ${formData.other_pets_neutered ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
              >
                <Ionicons name={formData.other_pets_neutered ? "checkmark-circle" : "ellipse-outline"} size={20} color={formData.other_pets_neutered ? "white" : "#CCC"} />
                <Text className={`font-black text-xs ${formData.other_pets_neutered ? 'text-white' : 'text-gray-400'}`}>Pets Neutered</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setFormData({...formData, has_secure_outdoor_area: !formData.has_secure_outdoor_area})}
                className={`flex-1 p-4 rounded-2xl border-2 flex-row items-center justify-center space-x-2 ${formData.has_secure_outdoor_area ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
              >
                <Ionicons name={formData.has_secure_outdoor_area ? "checkmark-circle" : "ellipse-outline"} size={20} color={formData.has_secure_outdoor_area ? "white" : "#CCC"} />
                <Text className={`font-black text-xs ${formData.has_secure_outdoor_area ? 'text-white' : 'text-gray-400'}`}>Secure Yard</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View className="space-y-6">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-green-50 rounded-3xl items-center justify-center mb-2">
                <Ionicons name="heart" size={32} color="#10b981" />
              </View>
              <Text className="text-xl font-black text-gray-900">Commitment</Text>
              <Text className="text-gray-400 font-bold">Final details & agreement</Text>
            </View>

            <View>
              <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Time Left Alone</Text>
              <TextInput
                value={formData.pet_left_alone}
                onChangeText={(text) => setFormData({...formData, pet_left_alone: text})}
                placeholder="e.g. 2-4 hours"
                className="bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border border-gray-100"
              />
            </View>

            <View>
              <Text className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Additional Details</Text>
              <TextInput
                value={formData.additional_details}
                onChangeText={(text) => setFormData({...formData, additional_details: text})}
                placeholder="Anything else?"
                multiline
                className="bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 border border-gray-100 min-h-[80px]"
              />
            </View>

            <TouchableOpacity 
              onPress={() => setFormData({...formData, agree_to_terms: !formData.agree_to_terms})}
              className={`p-6 rounded-[2rem] border-2 flex-row ${formData.agree_to_terms ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-100'}`}
            >
              <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 mt-1 ${formData.agree_to_terms ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
                {formData.agree_to_terms && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <View className="flex-1">
                <Text className="font-black text-gray-800 leading-tight mb-2">
                  I agree to provide a safe environment and never abandon the pet.
                </Text>
                <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Legal commitment to care
                </Text>
              </View>
            </TouchableOpacity>
            {errors.agree_to_terms && <Text className="text-red-500 text-xs font-bold text-center">{errors.agree_to_terms}</Text>}
          </View>
        )}
        
        <View className="h-10" />
      </ScrollView>

      <View className="p-5 flex-row gap-4 bg-white border-t border-gray-50">
        {currentStep > 1 && (
          <TouchableOpacity 
            onPress={() => setCurrentStep(prev => prev - 1)}
            className="w-20 h-[72px] bg-gray-50 rounded-[2rem] items-center justify-center border border-gray-100"
          >
            <Ionicons name="arrow-back" size={24} color="#999" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={currentStep === 3 ? handleSubmit : handleNext}
          disabled={loading}
          className={`flex-1 h-[72px] rounded-[2rem] items-center justify-center flex-row shadow-2xl shadow-primary/30 ${currentStep === 3 ? 'bg-gray-900' : 'bg-primary'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-black uppercase tracking-widest mr-2">
                {currentStep === 3 ? 'Submit Application' : 'Continue'}
              </Text>
              <Ionicons name={currentStep === 3 ? "checkmark-circle" : "arrow-forward"} size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
