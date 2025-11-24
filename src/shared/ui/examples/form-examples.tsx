/**
 * Examples of Form components
 * 
 * These examples show how to use all the form components
 * from the UI library
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  Input, 
  Checkbox, 
  RadioGroup, 
  Toggle, 
  Select 
} from '../forms';

export const FormExamples = () => {
  // State for form controls
  const [inputValue, setInputValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [toggleValue, setToggleValue] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  
  const radioOptions = [
    { value: 'option1', label: 'Morning Prayer', icon: <Ionicons name="sunny" size={16} color="#FFD700" /> },
    { value: 'option2', label: 'Evening Prayer', icon: <Ionicons name="moon" size={16} color="#B8B8FF" /> },
    { value: 'option3', label: 'Anytime', icon: <Ionicons name="time" size={16} color="#FFFFFF" /> },
  ];
  
  const selectOptions = [
    { value: 'daily', label: 'Daily', icon: <Ionicons name="calendar" size={16} color="#FFFFFF" /> },
    { value: 'weekly', label: 'Weekly', icon: <Ionicons name="calendar-outline" size={16} color="#FFFFFF" /> },
    { value: 'monthly', label: 'Monthly', icon: <Ionicons name="calendar-clear" size={16} color="#FFFFFF" /> },
  ];
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Form Components</Text>
      
      {/* Input Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Input Fields</Text>
        
        <Input
          label="Your Name"
          placeholder="Enter your name"
          value={inputValue}
          onChangeText={setInputValue}
          showClearButton
        />
        
        <Input
          label="Email"
          placeholder="email@example.com"
          keyboardType="email-address"
          icon={<Ionicons name="mail" size={20} color="rgba(255,255,255,0.5)" />}
        />
        
        <Input
          label="Password"
          placeholder="Enter password"
          secureTextEntry
          value={passwordValue}
          onChangeText={setPasswordValue}
          icon={<Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.5)" />}
        />
        
        <Input
          label="Prayer Request"
          placeholder="What's on your heart?"
          multiline
          numberOfLines={3}
          maxLength={200}
          charCount
          helper="Share your prayer request (max 200 characters)"
        />
        
        <Input
          label="With Error"
          placeholder="This field has an error"
          error="Please enter a valid value"
        />
      </View>
      
      {/* Checkbox Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Checkboxes</Text>
        
        <Checkbox
          checked={checkboxValue}
          onCheckedChange={setCheckboxValue}
          label="Remember me in prayers"
        />
        
        <View style={{ height: 12 }} />
        
        <Checkbox
          checked={true}
          label="Daily reminders (checked)"
          disabled
        />
        
        <View style={{ height: 12 }} />
        
        <Checkbox
          checked={false}
          label="Email notifications"
          size="small"
        />
      </View>
      
      {/* Radio Group Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Radio Groups</Text>
        
        <Text style={styles.label}>Prayer Time (Chip Style)</Text>
        <RadioGroup
          value={radioValue}
          onValueChange={setRadioValue}
          options={radioOptions}
          variant="chip"
        />
        
        <View style={{ height: 20 }} />
        
        <Text style={styles.label}>Prayer Time (Radio Style)</Text>
        <RadioGroup
          value={radioValue}
          onValueChange={setRadioValue}
          options={radioOptions}
          variant="radio"
        />
      </View>
      
      {/* Toggle Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Toggles</Text>
        
        <Toggle
          checked={toggleValue}
          onCheckedChange={setToggleValue}
          label="Enable notifications"
        />
        
        <View style={{ height: 12 }} />
        
        <Toggle
          checked={true}
          label="Dark mode (disabled)"
          disabled
        />
        
        <View style={{ height: 12 }} />
        
        <Toggle
          checked={false}
          label="Show prayer count"
          size="small"
        />
      </View>
      
      {/* Select Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select/Dropdown</Text>
        
        <Select
          label="Prayer Frequency"
          placeholder="Select frequency"
          value={selectValue}
          onValueChange={setSelectValue}
          options={selectOptions}
        />
        
        <View style={{ height: 12 }} />
        
        <Select
          label="With Error"
          value=""
          options={selectOptions}
          error="Please select a frequency"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    paddingLeft: 4,
  },
}); 