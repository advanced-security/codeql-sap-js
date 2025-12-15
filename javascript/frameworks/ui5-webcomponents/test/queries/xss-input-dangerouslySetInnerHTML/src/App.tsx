import { useState, useRef, useEffect, useCallback } from 'react';
import {Input, TextArea, Search, ShellBarSearch, ComboBox, MultiComboBox, Select, DatePicker, DateRangePicker, DateTimePicker, TimePicker, ColorPicker, ColorPaletteItem, CalendarDate, FileUploader, CheckBox, RadioButton, Switch, Option, OptionCustom, RatingIndicator, Slider, ProgressIndicator, StepInput, DynamicDateRange, RangeSlider, Button, MessageViewButton, SegmentedButton, SplitButton, ToggleButton } from "@ui5/webcomponents-react";
import '@ui5/webcomponents/dist/Assets.js';

function App() {
  /* `Input`: Accepts unrestricted string */
  const [inputValue, setInputValue] = useState<string>("");
  const inputRef = useRef<typeof Input>(null);

  const handleInputChange = useCallback(() => {
    setInputValue((msg) => inputRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setInputValue]);

  useEffect(() => {
    const currentInput = inputRef.current;
    currentInput?.addEventListener("change", handleInputChange);
    return () => {
      currentInput?.removeEventListener("change", handleInputChange);
    };
  }, [handleInputChange]);

  /* `TextArea`: Accepts unrestricted string */
  const [textAreaValue, setTextAreaValue] = useState<string>("");
  const textAreaRef = useRef<typeof TextArea>(null);

  const handleTextAreaChange = useCallback(() => {
    setTextAreaValue((msg) => textAreaRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setTextAreaValue]);

  useEffect(() => {
    const currentTextArea = textAreaRef.current;
    currentTextArea?.addEventListener("change", handleTextAreaChange);
    return () => {
      currentTextArea?.removeEventListener("change", handleTextAreaChange);
    };
  }, [handleTextAreaChange]);

  /* `Search`: Accepts unrestricted string */
  const [searchValue, setSearchValue] = useState<string>("");
  const searchRef = useRef<typeof Search>(null);

  const handleSearchChange = useCallback(() => {
    setSearchValue((msg) => searchRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setSearchValue]);

  useEffect(() => {
    const currentSearch = searchRef.current;
    currentSearch?.addEventListener("change", handleSearchChange);
    return () => {
      currentSearch?.removeEventListener("change", handleSearchChange);
    };
  }, [handleSearchChange]);

  /* `ShellBarSearch`: Accepts unrestricted string */
  const [shellBarSearchValue, setShellBarSearchValue] = useState<string>("");
  const shellBarSearchRef = useRef<typeof ShellBarSearch>(null);

  const handleShellBarSearchChange = useCallback(() => {
    setShellBarSearchValue((msg) => shellBarSearchRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setShellBarSearchValue]);

  useEffect(() => {
    const currentShellBarSearch = shellBarSearchRef.current;
    currentShellBarSearch?.addEventListener("change", handleShellBarSearchChange);
    return () => {
      currentShellBarSearch?.removeEventListener("change", handleShellBarSearchChange);
    };
  }, [handleShellBarSearchChange]);

  /* `ComboBox`: Accepts unrestricted string */
  const [comboBoxValue, setComboBoxValue] = useState<string>("");
  const comboBoxRef = useRef<typeof ComboBox>(null);

  const handleComboBoxChange = useCallback(() => {
    setComboBoxValue((msg) => comboBoxRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setComboBoxValue]);

  useEffect(() => {
    const currentComboBox = comboBoxRef.current;
    currentComboBox?.addEventListener("change", handleComboBoxChange);
    return () => {
      currentComboBox?.removeEventListener("change", handleComboBoxChange);
    };
  }, [handleComboBoxChange]);

  /* `MultiComboBox`: Accepts unrestricted string */
  const [multiComboBoxValue, setMultiComboBoxValue] = useState<string>("");
  const multiComboBoxRef = useRef<typeof MultiComboBox>(null);

  const handleMultiComboBoxChange = useCallback(() => {
    setMultiComboBoxValue((msg) => multiComboBoxRef.current?.value || ""); // UNSAFE: Unrestricted string set as content
  }, [setMultiComboBoxValue]);

  useEffect(() => {
    const currentMultiComboBox = multiComboBoxRef.current;
    currentMultiComboBox?.addEventListener("change", handleMultiComboBoxChange);
    return () => {
      currentMultiComboBox?.removeEventListener("change", handleMultiComboBoxChange);
    };
  }, [handleMultiComboBoxChange]);

  /* `Select`: Accepts enum-like string */
  const [selectValue, setSelectValue] = useState<string>("");
  const selectRef = useRef<typeof Select>(null);

  const handleSelectChange = useCallback(() => {
    setSelectValue((msg) => selectRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setSelectValue]);

  useEffect(() => {
    const currentSelect = selectRef.current;
    currentSelect?.addEventListener("change", handleSelectChange);
    return () => {
      currentSelect?.removeEventListener("change", handleSelectChange);
    };
  }, [handleSelectChange]);

  /* `DatePicker`: Accepts unrestricted string */
  const [datePickerValue, setDatePickerValue] = useState<string>("");
  const datePickerRef = useRef<typeof DatePicker>(null);

  const handleDatePickerChange = useCallback(() => {
    setDatePickerValue((msg) => datePickerRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setDatePickerValue]);

  useEffect(() => {
    const currentDatePicker = datePickerRef.current;
    currentDatePicker?.addEventListener("change", handleDatePickerChange);
    return () => {
      currentDatePicker?.removeEventListener("change", handleDatePickerChange);
    };
  }, [handleDatePickerChange]);

  /* `DateRangePicker`: Accepts unrestricted string */
  const [dateRangePickerValue, setDateRangePickerValue] = useState<string>("");
  const dateRangePickerRef = useRef<typeof DateRangePicker>(null);

  const handleDateRangePickerChange = useCallback(() => {
    setDateRangePickerValue((msg) => dateRangePickerRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setDateRangePickerValue]);

  useEffect(() => {
    const currentDateRangePicker = dateRangePickerRef.current;
    currentDateRangePicker?.addEventListener("change", handleDateRangePickerChange);
    return () => {
      currentDateRangePicker?.removeEventListener("change", handleDateRangePickerChange);
    };
  }, [handleDateRangePickerChange]);

  /* `DateTimePicker`: Accepts unrestricted string */
  const [dateTimePickerValue, setDateTimePickerValue] = useState<string>("");
  const dateTimePickerRef = useRef<typeof DateTimePicker>(null);

  const handleDateTimePickerChange = useCallback(() => {
    setDateTimePickerValue((msg) => dateTimePickerRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setDateTimePickerValue]);

  useEffect(() => {
    const currentDateTimePicker = dateTimePickerRef.current;
    currentDateTimePicker?.addEventListener("change", handleDateTimePickerChange);
    return () => {
      currentDateTimePicker?.removeEventListener("change", handleDateTimePickerChange);
    };
  }, [handleDateTimePickerChange]);

  /* `TimePicker`: Accepts unrestricted string */
  const [timePickerValue, setTimePickerValue] = useState<string>("");
  const timePickerRef = useRef<typeof TimePicker>(null);

  const handleTimePickerChange = useCallback(() => {
    setTimePickerValue((msg) => timePickerRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setTimePickerValue]);

  useEffect(() => {
    const currentTimePicker = timePickerRef.current;
    currentTimePicker?.addEventListener("change", handleTimePickerChange);
    return () => {
      currentTimePicker?.removeEventListener("change", handleTimePickerChange);
    };
  }, [handleTimePickerChange]);

  /* `ColorPicker`: Accepts restricted values only */
  const [colorPickerValue, setColorPickerValue] = useState<string>("");
  const colorPickerRef = useRef<typeof ColorPicker>(null);

  const handleColorPickerChange = useCallback(() => {
    setColorPickerValue((msg) => colorPickerRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setColorPickerValue]);

  useEffect(() => {
    const currentColorPicker = colorPickerRef.current;
    currentColorPicker?.addEventListener("change", handleColorPickerChange);
    return () => {
      currentColorPicker?.removeEventListener("change", handleColorPickerChange);
    };
  }, [handleColorPickerChange]);

  /* `ColorPaletteItem`: Accepts restricted values only */
  const [colorPaletteItemValue, setColorPaletteItemValue] = useState<string>("");
  const colorPaletteItemRef = useRef<typeof ColorPaletteItem>(null);

  const handleColorPaletteItemChange = useCallback(() => {
    setColorPaletteItemValue((msg) => colorPaletteItemRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setColorPaletteItemValue]);

  useEffect(() => {
    const currentColorPaletteItem = colorPaletteItemRef.current;
    currentColorPaletteItem?.addEventListener("change", handleColorPaletteItemChange);
    return () => {
      currentColorPaletteItem?.removeEventListener("change", handleColorPaletteItemChange);
    };
  }, [handleColorPaletteItemChange]);

  /* `CalendarDate` Accepts restricted values only */
  const [calendarDateValue, setCalendarDateValue] = useState<string>("");
  const calendarDateRef = useRef<typeof CalendarDate>(null);

  const handleCalendarDateChange = useCallback(() => {
    setCalendarDateValue((msg) => calendarDateRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setCalendarDateValue]);

  useEffect(() => {
    const currentCalendarDate = calendarDateRef.current;
    currentCalendarDate?.addEventListener("change", handleCalendarDateChange);
    return () => {
      currentCalendarDate?.removeEventListener("change", handleCalendarDateChange);
    };
  }, [handleCalendarDateChange]);

  /* `FileUploader`: does not accept values other than file picker based input */
  const [fileUploaderValue, setFileUploaderValue] = useState<string>("");
  const fileUploaderRef = useRef<typeof FileUploader>(null);

  const handleFileUploaderChange = useCallback(() => {
    setFileUploaderValue((msg) => fileUploaderRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setFileUploaderValue]);

  useEffect(() => {
    const currentFileUploader = fileUploaderRef.current;
    currentFileUploader?.addEventListener("change", handleFileUploaderChange);
    return () => {
      currentFileUploader?.removeEventListener("change", handleFileUploaderChange);
    };
  }, [handleFileUploaderChange]);

  /* `CheckBox`: does not accept arbitrary values */
  const [checkBoxValue, setCheckBoxValue] = useState<string>("");
  const checkBoxRef = useRef<typeof CheckBox>(null);

  const handleCheckBoxChange = useCallback(() => {
    setCheckBoxValue((msg) => checkBoxRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setCheckBoxValue]);

  useEffect(() => {
    const currentCheckBox = checkBoxRef.current;
    currentCheckBox?.addEventListener("change", handleCheckBoxChange);
    return () => {
      currentCheckBox?.removeEventListener("change", handleCheckBoxChange);
    };
  }, [handleCheckBoxChange]);

  /* `RadioButton`: does not accept arbitrary values */
  const [radioButtonValue, setRadioButtonValue] = useState<string>("");
  const radioButtonRef = useRef<typeof RadioButton>(null);

  const handleRadioButtonChange = useCallback(() => {
    setRadioButtonValue((msg) => radioButtonRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setRadioButtonValue]);

  useEffect(() => {
    const currentRadioButton = radioButtonRef.current;
    currentRadioButton?.addEventListener("change", handleRadioButtonChange);
    return () => {
      currentRadioButton?.removeEventListener("change", handleRadioButtonChange);
    };
  }, [handleRadioButtonChange]);

  /* `Switch`: does not accept arbitrary values */
  const [switchValue, setSwitchValue] = useState<string>("");
  const switchRef = useRef<typeof Switch>(null);

  const handleSwitchChange = useCallback(() => {
    setSwitchValue((msg) => switchRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setSwitchValue]);

  useEffect(() => {
    const currentSwitch = switchRef.current;
    currentSwitch?.addEventListener("change", handleSwitchChange);
    return () => {
      currentSwitch?.removeEventListener("change", handleSwitchChange);
    };
  }, [handleSwitchChange]);

  /* `Option`: Accepts unrestricted string */
  const [optionValue, setOptionValue] = useState<string>("");
  const optionRef = useRef<typeof Option>(null);

  const handleOptionChange = useCallback(() => {
    setOptionValue((msg) => optionRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setOptionValue]);

  useEffect(() => {
    const currentOption = optionRef.current;
    currentOption?.addEventListener("change", handleOptionChange);
    return () => {
      currentOption?.removeEventListener("change", handleOptionChange);
    };
  }, [handleOptionChange]);

  /* `OptionCustom`: Accepts unrestricted string */
  const [optionCustomValue, setOptionCustomValue] = useState<string>("");
  const optionCustomRef = useRef<typeof OptionCustom>(null);

  const handleOptionCustomChange = useCallback(() => {
    setOptionCustomValue((msg) => optionCustomRef.current?.value || "");  // UNSAFE: Unrestricted string set as content
  }, [setOptionCustomValue]);

  useEffect(() => {
    const currentOptionCustom = optionCustomRef.current;
    currentOptionCustom?.addEventListener("change", handleOptionCustomChange);
    return () => {
      currentOptionCustom?.removeEventListener("change", handleOptionCustomChange);
    };
  }, [handleOptionCustomChange]);

  /* `RatingIndicator`: does not accept arbitrary values */
  const [ratingIndicatorValue, setRatingIndicatorValue] = useState<string>("");
  const ratingIndicatorRef = useRef<typeof RatingIndicator>(null);

  const handleRatingIndicatorChange = useCallback(() => {
    setRatingIndicatorValue((msg) => ratingIndicatorRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setRatingIndicatorValue]);

  useEffect(() => {
    const currentRatingIndicator = ratingIndicatorRef.current;
    currentRatingIndicator?.addEventListener("change", handleRatingIndicatorChange);
    return () => {
      currentRatingIndicator?.removeEventListener("change", handleRatingIndicatorChange);
    };
  }, [handleRatingIndicatorChange]);

  /* `Slider`: does not accept arbitrary values */
  const [sliderValue, setSliderValue] = useState<string>("");
  const sliderRef = useRef<typeof Slider>(null);

  const handleSliderChange = useCallback(() => {
    setSliderValue((msg) => sliderRef.current?.value || ""); // SAFE: Does not take unrestricted string (numeric input)
  }, [setSliderValue]);

  useEffect(() => {
    const currentSlider = sliderRef.current;
    currentSlider?.addEventListener("change", handleSliderChange);
    return () => {
      currentSlider?.removeEventListener("change", handleSliderChange);
    };
  }, [handleSliderChange]);

  /* `ProgressIndicator`: does not accept arbitrary values */
  const [progressIndicatorValue, setProgressIndicatorValue] = useState<string>("");
  const progressIndicatorRef = useRef<typeof ProgressIndicator>(null);

  const handleProgressIndicatorChange = useCallback(() => {
    setProgressIndicatorValue((msg) => progressIndicatorRef.current?.value || ""); // SAFE: Does not take unrestricted string (numeric input)
  }, [setProgressIndicatorValue]);

  useEffect(() => {
    const currentProgressIndicator = progressIndicatorRef.current;
    currentProgressIndicator?.addEventListener("change", handleProgressIndicatorChange);
    return () => {
      currentProgressIndicator?.removeEventListener("change", handleProgressIndicatorChange);
    };
  }, [handleProgressIndicatorChange]);

  /* `StepInput`: does not accept arbitrary values */
  const [stepInputValue, setStepInputValue] = useState<string>("");
  const stepInputRef = useRef<typeof StepInput>(null);

  const handleStepInputChange = useCallback(() => {
    setStepInputValue((msg) => stepInputRef.current?.value || ""); // SAFE: Does not take unrestricted string (numeric input)
  }, [setStepInputValue]);

  useEffect(() => {
    const currentStepInput = stepInputRef.current;
    currentStepInput?.addEventListener("change", handleStepInputChange);
    return () => {
      currentStepInput?.removeEventListener("change", handleStepInputChange);
    };
  }, [handleStepInputChange]);

  /* `DynamicDateRange`: does not accept arbitrary values */
  const [dynamicDateRangeValue, setDynamicDateRangeValue] = useState<string>("");
  const dynamicDateRangeRef = useRef<typeof DynamicDateRange>(null);

  const handleDynamicDateRangeChange = useCallback(() => {
    setDynamicDateRangeValue((msg) => dynamicDateRangeRef.current?.value || ""); // SAFE: Does not take unrestricted string (numeric input)
  }, [setDynamicDateRangeValue]);

  useEffect(() => {
    const currentDynamicDateRange = dynamicDateRangeRef.current;
    currentDynamicDateRange?.addEventListener("change", handleDynamicDateRangeChange);
    return () => {
      currentDynamicDateRange?.removeEventListener("change", handleDynamicDateRangeChange);
    };
  }, [handleDynamicDateRangeChange]);

  /* `RangeSlider`: does not accept arbitrary values */
  const [rangeSliderValue, setRangeSliderValue] = useState<string>("");
  const rangeSliderRef = useRef<typeof RangeSlider>(null);

  const handleRangeSliderChange = useCallback(() => {
    setRangeSliderValue((msg) => rangeSliderRef.current?.value || ""); // SAFE: Does not take unrestricted string (numeric input)
  }, [setRangeSliderValue]);

  useEffect(() => {
    const currentRangeSlider = rangeSliderRef.current;
    currentRangeSlider?.addEventListener("change", handleRangeSliderChange);
    return () => {
      currentRangeSlider?.removeEventListener("change", handleRangeSliderChange);
    };
  }, [handleRangeSliderChange]);

  /* `Button`: does not accept arbitrary values */
  const [buttonValue, setButtonValue] = useState<string>("");
  const buttonRef = useRef<typeof Button>(null);

  const handleButtonChange = useCallback(() => {
    setButtonValue((msg) => buttonRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setButtonValue]);

  useEffect(() => {
    const currentButton = buttonRef.current;
    currentButton?.addEventListener("change", handleButtonChange);
    return () => {
      currentButton?.removeEventListener("change", handleButtonChange);
    };
  }, [handleButtonChange]);

  /* `MessageViewButton`: does not accept arbitrary values */
  const [messageViewButtonValue, setMessageViewButtonValue] = useState<string>("");
  const messageViewButtonRef = useRef<typeof MessageViewButton>(null);

  const handleMessageViewButtonChange = useCallback(() => {
    setMessageViewButtonValue((msg) => messageViewButtonRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setMessageViewButtonValue]);

  useEffect(() => {
    const currentMessageViewButton = messageViewButtonRef.current;
    currentMessageViewButton?.addEventListener("change", handleMessageViewButtonChange);
    return () => {
      currentMessageViewButton?.removeEventListener("change", handleMessageViewButtonChange);
    };
  }, [handleMessageViewButtonChange]);

  /* `SegmentedButton`: does not accept arbitrary values */
  const [segmentedButtonValue, setSegmentedButtonValue] = useState<string>("");
  const segmentedButtonRef = useRef<typeof SegmentedButton>(null);

  const handleSegmentedButtonChange = useCallback(() => {
    setSegmentedButtonValue((msg) => segmentedButtonRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setSegmentedButtonValue]);

  useEffect(() => {
    const currentSegmentedButton = segmentedButtonRef.current;
    currentSegmentedButton?.addEventListener("change", handleSegmentedButtonChange);
    return () => {
      currentSegmentedButton?.removeEventListener("change", handleSegmentedButtonChange);
    };
  }, [handleSegmentedButtonChange]);

  /* `SplitButton`: does not accept arbitrary values */
  const [splitButtonValue, setSplitButtonValue] = useState<string>("");
  const splitButtonRef = useRef<typeof SplitButton>(null);

  const handleSplitButtonChange = useCallback(() => {
    setSplitButtonValue((msg) => splitButtonRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setSplitButtonValue]);

  useEffect(() => {
    const currentSplitButton = splitButtonRef.current;
    currentSplitButton?.addEventListener("change", handleSplitButtonChange);
    return () => {
      currentSplitButton?.removeEventListener("change", handleSplitButtonChange);
    };
  }, [handleSplitButtonChange]);

  /* `ToggleButton`: does not accept arbitrary values */
  const [toggleButtonValue, setToggleButtonValue] = useState<string>("");
  const toggleButtonRef = useRef<typeof ToggleButton>(null);

  const handleToggleButtonChange = useCallback(() => {
    setToggleButtonValue((msg) => toggleButtonRef.current?.value || ""); // SAFE: Does not take unrestricted string
  }, [setToggleButtonValue]);

  useEffect(() => {
    const currentToggleButton = toggleButtonRef.current;
    currentToggleButton?.addEventListener("change", handleToggleButtonChange);
    return () => {
      currentToggleButton?.removeEventListener("change", handleToggleButtonChange);
    };
  }, [handleToggleButtonChange]);

  
  return (
    <div className="app">
      <Input placeholder="Input" ref={inputRef} id="input-field"></Input> {/* Potentially Unsafe */}
      <TextArea placeholder="TextArea" ref={textAreaRef} id="textarea-field"></TextArea>  {/* Potentially Unsafe */}
      <Search placeholder="Search" ref={searchRef} id="search-field"></Search>  {/* Potentially Unsafe */}
      <ShellBarSearch placeholder="ShellBarSearch" ref={shellBarSearchRef} id="shellbarsearch-field"></ShellBarSearch>  {/* Potentially Unsafe */}
      <ComboBox placeholder="ComboBox" ref={comboBoxRef} id="combobox-field"></ComboBox>  {/* Potentially Unsafe */}
      <MultiComboBox placeholder="MultiComboBox" ref={multiComboBoxRef} id="multicombobox-field" noValidation="true"></MultiComboBox> {/* Potentially Unsafe */}
      <Select ref={selectRef} id="select-field"></Select> {/* Safe - accepts a fixed set of strings */}
      <DatePicker placeholder="DatePicker" ref={datePickerRef} id="datepicker-field"></DatePicker>  {/* Potentially Unsafe */}
      <DateRangePicker placeholder="DateRangePicker" ref={dateRangePickerRef} id="daterangepicker-field"></DateRangePicker>  {/* Potentially Unsafe */}
      <DateTimePicker placeholder="DateTimePicker" ref={dateTimePickerRef} id="datetimepicker-field"></DateTimePicker>  {/* Potentially Unsafe */}
      <TimePicker placeholder="TimePicker" ref={timePickerRef} id="timepicker-field"></TimePicker>  {/* Potentially Unsafe */}
      <ColorPicker ref={colorPickerRef} id="colorpicker-field"></ColorPicker> {/* Safe - does not accept any string input */}
      <ColorPaletteItem value="color" ref={colorPaletteItemRef} id="colorpaletteitem-field"></ColorPaletteItem> {/* Safe - does not accept any string input */}
      <CalendarDate value="20250101" ref={calendarDateRef} id="calendardate-field"></CalendarDate> {/* Safe - not a standalone component */}
      <FileUploader ref={fileUploaderRef} id="fileuploader-field"></FileUploader> {/* Safe - accepts a fixed set of strings */}
      <CheckBox ref={checkBoxRef} id="checkbox-field"></CheckBox> {/* Safe - does not accept any string input */}
      <RadioButton ref={radioButtonRef} id="radiobutton-field"></RadioButton> {/* Safe - does not accept any input */}
      <Switch ref={switchRef} id="switch-field"></Switch> {/* Safe - does not accept any input */}
      <Option value="option" ref={optionRef} id="option-field"></Option> {/* Potentially Unsafe */}
      <OptionCustom value="custom" ref={optionCustomRef} id="optioncustom-field"></OptionCustom> {/* Potentially Unsafe */}
      <RatingIndicator ref={ratingIndicatorRef} id="ratingindicator-field"></RatingIndicator> {/* Safe - numeric */}
      <Slider ref={sliderRef} id="slider-field"></Slider> {/* Safe - numeric */}
      <ProgressIndicator ref={progressIndicatorRef} id="progressindicator-field"></ProgressIndicator> {/* Safe - numeric */}
      <StepInput ref={stepInputRef} id="stepinput-field"></StepInput> {/* Safe - numeric */}
      <DynamicDateRange ref={dynamicDateRangeRef} id="dynamicdaterange-field"></DynamicDateRange> {/* Safe - numeric */}
      <RangeSlider ref={rangeSliderRef} id="rangeslider-field"></RangeSlider> {/* Safe - numeric */}
      <Button ref={buttonRef} id="button-field">Button</Button> {/* Safe - does not accept any input */}
      <MessageViewButton ref={messageViewButtonRef} id="messageviewbutton-field"></MessageViewButton> {/* Safe - does not accept any input */}
      <SegmentedButton ref={segmentedButtonRef} id="segmentedbutton-field"></SegmentedButton> {/* Safe - does not accept any input */}
      <SplitButton ref={splitButtonRef} id="splitbutton-field">Split</SplitButton> {/* Safe - does not accept any input */}
      <ToggleButton ref={toggleButtonRef} id="togglebutton-field">Toggle</ToggleButton> {/* Safe - does not accept any input */}

      <div dangerouslySetInnerHTML={{__html: inputValue}}></div>
      <div dangerouslySetInnerHTML={{__html: textAreaValue}}></div>
      <div dangerouslySetInnerHTML={{__html: searchValue}}></div>
      <div dangerouslySetInnerHTML={{__html: shellBarSearchValue}}></div>
      <div dangerouslySetInnerHTML={{__html: comboBoxValue}}></div>
      <div dangerouslySetInnerHTML={{__html: multiComboBoxValue}}></div>
      <div dangerouslySetInnerHTML={{__html: selectValue}}></div>
      <div dangerouslySetInnerHTML={{__html: datePickerValue}}></div>
      <div dangerouslySetInnerHTML={{__html: dateRangePickerValue}}></div>
      <div dangerouslySetInnerHTML={{__html: dateTimePickerValue}}></div>
      <div dangerouslySetInnerHTML={{__html: timePickerValue}}></div>
      <div dangerouslySetInnerHTML={{__html: colorPickerValue}}></div>
      <div dangerouslySetInnerHTML={{__html: colorPaletteItemValue}}></div>
      <div dangerouslySetInnerHTML={{__html: calendarDateValue}}></div>
      <div dangerouslySetInnerHTML={{__html: fileUploaderValue}}></div>
      <div dangerouslySetInnerHTML={{__html: checkBoxValue}}></div>
      <div dangerouslySetInnerHTML={{__html: radioButtonValue}}></div>
      <div dangerouslySetInnerHTML={{__html: switchValue}}></div>
      <div dangerouslySetInnerHTML={{__html: optionValue}}></div>
      <div dangerouslySetInnerHTML={{__html: optionCustomValue}}></div>
      <div dangerouslySetInnerHTML={{__html: ratingIndicatorValue}}></div>
      <div dangerouslySetInnerHTML={{__html: sliderValue}}></div>
      <div dangerouslySetInnerHTML={{__html: progressIndicatorValue}}></div>
      <div dangerouslySetInnerHTML={{__html: stepInputValue}}></div>
      <div dangerouslySetInnerHTML={{__html: dynamicDateRangeValue}}></div>
      <div dangerouslySetInnerHTML={{__html: rangeSliderValue}}></div>
      <div dangerouslySetInnerHTML={{__html: buttonValue}}></div>
      <div dangerouslySetInnerHTML={{__html: messageViewButtonValue}}></div>
      <div dangerouslySetInnerHTML={{__html: segmentedButtonValue}}></div>
      <div dangerouslySetInnerHTML={{__html: splitButtonValue}}></div>
      <div dangerouslySetInnerHTML={{__html: toggleButtonValue}}></div>
    </div>
  );
}

export default App;