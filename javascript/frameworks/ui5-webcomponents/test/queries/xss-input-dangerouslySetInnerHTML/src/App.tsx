import { useState, useRef, useEffect, useCallback } from 'react';
import {Input, TextArea, Search, ShellBarSearch, ComboBox, MultiComboBox, Select, DatePicker, DateRangePicker, DateTimePicker, TimePicker, ColorPicker, ColorPaletteItem, CalendarDate, FileUploader, CheckBox, RadioButton, Switch, Option, OptionCustom, RatingIndicator, Slider, ProgressIndicator, StepInput, DynamicDateRange } from "@ui5/webcomponents-react";
import '@ui5/webcomponents/dist/Assets.js';

function App() {
  // Input component usage
  const [inputValue, setInputValue] = useState<string>("");
  const inputRef = useRef<typeof Input>(null);

  const handleInputChange = useCallback(() => {
    setInputValue((msg) => inputRef.current?.value || "");
  }, [setInputValue]);

  useEffect(() => {
    const currentInput = inputRef.current;
    currentInput?.addEventListener("change", handleInputChange);
    return () => {
      currentInput?.removeEventListener("change", handleInputChange);
    };
  }, [handleInputChange]);

  // TextArea component usage
  const [textAreaValue, setTextAreaValue] = useState<string>("");
  const textAreaRef = useRef<typeof TextArea>(null);

  const handleTextAreaChange = useCallback(() => {
    setTextAreaValue((msg) => textAreaRef.current?.value || "");
  }, [setTextAreaValue]);

  useEffect(() => {
    const currentTextArea = textAreaRef.current;
    currentTextArea?.addEventListener("change", handleTextAreaChange);
    return () => {
      currentTextArea?.removeEventListener("change", handleTextAreaChange);
    };
  }, [handleTextAreaChange]);

  // Search component usage
  const [searchValue, setSearchValue] = useState<string>("");
  const searchRef = useRef<typeof Search>(null);

  const handleSearchChange = useCallback(() => {
    setSearchValue((msg) => searchRef.current?.value || "");
  }, [setSearchValue]);

  useEffect(() => {
    const currentSearch = searchRef.current;
    currentSearch?.addEventListener("change", handleSearchChange);
    return () => {
      currentSearch?.removeEventListener("change", handleSearchChange);
    };
  }, [handleSearchChange]);

  // ShellBarSearch component usage
  const [shellBarSearchValue, setShellBarSearchValue] = useState<string>("");
  const shellBarSearchRef = useRef<typeof ShellBarSearch>(null);

  const handleShellBarSearchChange = useCallback(() => {
    setShellBarSearchValue((msg) => shellBarSearchRef.current?.value || "");
  }, [setShellBarSearchValue]);

  useEffect(() => {
    const currentShellBarSearch = shellBarSearchRef.current;
    currentShellBarSearch?.addEventListener("change", handleShellBarSearchChange);
    return () => {
      currentShellBarSearch?.removeEventListener("change", handleShellBarSearchChange);
    };
  }, [handleShellBarSearchChange]);

  // ComboBox component usage
  const [comboBoxValue, setComboBoxValue] = useState<string>("");
  const comboBoxRef = useRef<typeof ComboBox>(null);

  const handleComboBoxChange = useCallback(() => {
    setComboBoxValue((msg) => comboBoxRef.current?.value || "");
  }, [setComboBoxValue]);

  useEffect(() => {
    const currentComboBox = comboBoxRef.current;
    currentComboBox?.addEventListener("change", handleComboBoxChange);
    return () => {
      currentComboBox?.removeEventListener("change", handleComboBoxChange);
    };
  }, [handleComboBoxChange]);

  // MultiComboBox component usage
  const [multiComboBoxValue, setMultiComboBoxValue] = useState<string>("");
  const multiComboBoxRef = useRef<typeof MultiComboBox>(null);

  const handleMultiComboBoxChange = useCallback(() => {
    setMultiComboBoxValue((msg) => multiComboBoxRef.current?.value || "");
  }, [setMultiComboBoxValue]);

  useEffect(() => {
    const currentMultiComboBox = multiComboBoxRef.current;
    currentMultiComboBox?.addEventListener("change", handleMultiComboBoxChange);
    return () => {
      currentMultiComboBox?.removeEventListener("change", handleMultiComboBoxChange);
    };
  }, [handleMultiComboBoxChange]);

  // Select component usage
  const [selectValue, setSelectValue] = useState<string>("");
  const selectRef = useRef<typeof Select>(null);

  const handleSelectChange = useCallback(() => {
    setSelectValue((msg) => selectRef.current?.value || "");
  }, [setSelectValue]);

  useEffect(() => {
    const currentSelect = selectRef.current;
    currentSelect?.addEventListener("change", handleSelectChange);
    return () => {
      currentSelect?.removeEventListener("change", handleSelectChange);
    };
  }, [handleSelectChange]);

  // DatePicker component usage
  const [datePickerValue, setDatePickerValue] = useState<string>("");
  const datePickerRef = useRef<typeof DatePicker>(null);

  const handleDatePickerChange = useCallback(() => {
    setDatePickerValue((msg) => datePickerRef.current?.value || "");
  }, [setDatePickerValue]);

  useEffect(() => {
    const currentDatePicker = datePickerRef.current;
    currentDatePicker?.addEventListener("change", handleDatePickerChange);
    return () => {
      currentDatePicker?.removeEventListener("change", handleDatePickerChange);
    };
  }, [handleDatePickerChange]);

  // DateRangePicker component usage
  const [dateRangePickerValue, setDateRangePickerValue] = useState<string>("");
  const dateRangePickerRef = useRef<typeof DateRangePicker>(null);

  const handleDateRangePickerChange = useCallback(() => {
    setDateRangePickerValue((msg) => dateRangePickerRef.current?.value || "");
  }, [setDateRangePickerValue]);

  useEffect(() => {
    const currentDateRangePicker = dateRangePickerRef.current;
    currentDateRangePicker?.addEventListener("change", handleDateRangePickerChange);
    return () => {
      currentDateRangePicker?.removeEventListener("change", handleDateRangePickerChange);
    };
  }, [handleDateRangePickerChange]);

  // DateTimePicker component usage
  const [dateTimePickerValue, setDateTimePickerValue] = useState<string>("");
  const dateTimePickerRef = useRef<typeof DateTimePicker>(null);

  const handleDateTimePickerChange = useCallback(() => {
    setDateTimePickerValue((msg) => dateTimePickerRef.current?.value || "");
  }, [setDateTimePickerValue]);

  useEffect(() => {
    const currentDateTimePicker = dateTimePickerRef.current;
    currentDateTimePicker?.addEventListener("change", handleDateTimePickerChange);
    return () => {
      currentDateTimePicker?.removeEventListener("change", handleDateTimePickerChange);
    };
  }, [handleDateTimePickerChange]);

  // TimePicker component usage
  const [timePickerValue, setTimePickerValue] = useState<string>("");
  const timePickerRef = useRef<typeof TimePicker>(null);

  const handleTimePickerChange = useCallback(() => {
    setTimePickerValue((msg) => timePickerRef.current?.value || "");
  }, [setTimePickerValue]);

  useEffect(() => {
    const currentTimePicker = timePickerRef.current;
    currentTimePicker?.addEventListener("change", handleTimePickerChange);
    return () => {
      currentTimePicker?.removeEventListener("change", handleTimePickerChange);
    };
  }, [handleTimePickerChange]);

  // ColorPicker component usage
  const [colorPickerValue, setColorPickerValue] = useState<string>("");
  const colorPickerRef = useRef<typeof ColorPicker>(null);

  const handleColorPickerChange = useCallback(() => {
    setColorPickerValue((msg) => colorPickerRef.current?.value || "");
  }, [setColorPickerValue]);

  useEffect(() => {
    const currentColorPicker = colorPickerRef.current;
    currentColorPicker?.addEventListener("change", handleColorPickerChange);
    return () => {
      currentColorPicker?.removeEventListener("change", handleColorPickerChange);
    };
  }, [handleColorPickerChange]);

  // ColorPaletteItem component usage
  const [colorPaletteItemValue, setColorPaletteItemValue] = useState<string>("");
  const colorPaletteItemRef = useRef<typeof ColorPaletteItem>(null);

  const handleColorPaletteItemChange = useCallback(() => {
    setColorPaletteItemValue((msg) => colorPaletteItemRef.current?.value || "");
  }, [setColorPaletteItemValue]);

  useEffect(() => {
    const currentColorPaletteItem = colorPaletteItemRef.current;
    currentColorPaletteItem?.addEventListener("change", handleColorPaletteItemChange);
    return () => {
      currentColorPaletteItem?.removeEventListener("change", handleColorPaletteItemChange);
    };
  }, [handleColorPaletteItemChange]);

  // CalendarDate component usage
  const [calendarDateValue, setCalendarDateValue] = useState<string>("");
  const calendarDateRef = useRef<typeof CalendarDate>(null);

  const handleCalendarDateChange = useCallback(() => {
    setCalendarDateValue((msg) => calendarDateRef.current?.value || "");
  }, [setCalendarDateValue]);

  useEffect(() => {
    const currentCalendarDate = calendarDateRef.current;
    currentCalendarDate?.addEventListener("change", handleCalendarDateChange);
    return () => {
      currentCalendarDate?.removeEventListener("change", handleCalendarDateChange);
    };
  }, [handleCalendarDateChange]);

  // FileUploader component usage
  const [fileUploaderValue, setFileUploaderValue] = useState<string>("");
  const fileUploaderRef = useRef<typeof FileUploader>(null);

  const handleFileUploaderChange = useCallback(() => {
    setFileUploaderValue((msg) => fileUploaderRef.current?.value || "");
  }, [setFileUploaderValue]);

  useEffect(() => {
    const currentFileUploader = fileUploaderRef.current;
    currentFileUploader?.addEventListener("change", handleFileUploaderChange);
    return () => {
      currentFileUploader?.removeEventListener("change", handleFileUploaderChange);
    };
  }, [handleFileUploaderChange]);

  // CheckBox component usage
  const [checkBoxValue, setCheckBoxValue] = useState<string>("");
  const checkBoxRef = useRef<typeof CheckBox>(null);

  const handleCheckBoxChange = useCallback(() => {
    setCheckBoxValue((msg) => checkBoxRef.current?.value || "");
  }, [setCheckBoxValue]);

  useEffect(() => {
    const currentCheckBox = checkBoxRef.current;
    currentCheckBox?.addEventListener("change", handleCheckBoxChange);
    return () => {
      currentCheckBox?.removeEventListener("change", handleCheckBoxChange);
    };
  }, [handleCheckBoxChange]);

  // RadioButton component usage
  const [radioButtonValue, setRadioButtonValue] = useState<string>("");
  const radioButtonRef = useRef<typeof RadioButton>(null);

  const handleRadioButtonChange = useCallback(() => {
    setRadioButtonValue((msg) => radioButtonRef.current?.value || "");
  }, [setRadioButtonValue]);

  useEffect(() => {
    const currentRadioButton = radioButtonRef.current;
    currentRadioButton?.addEventListener("change", handleRadioButtonChange);
    return () => {
      currentRadioButton?.removeEventListener("change", handleRadioButtonChange);
    };
  }, [handleRadioButtonChange]);

  // Switch component usage
  const [switchValue, setSwitchValue] = useState<string>("");
  const switchRef = useRef<typeof Switch>(null);

  const handleSwitchChange = useCallback(() => {
    setSwitchValue((msg) => switchRef.current?.value || "");
  }, [setSwitchValue]);

  useEffect(() => {
    const currentSwitch = switchRef.current;
    currentSwitch?.addEventListener("change", handleSwitchChange);
    return () => {
      currentSwitch?.removeEventListener("change", handleSwitchChange);
    };
  }, [handleSwitchChange]);

  // Option component usage
  const [optionValue, setOptionValue] = useState<string>("");
  const optionRef = useRef<typeof Option>(null);

  const handleOptionChange = useCallback(() => {
    setOptionValue((msg) => optionRef.current?.value || "");
  }, [setOptionValue]);

  useEffect(() => {
    const currentOption = optionRef.current;
    currentOption?.addEventListener("change", handleOptionChange);
    return () => {
      currentOption?.removeEventListener("change", handleOptionChange);
    };
  }, [handleOptionChange]);

  // OptionCustom component usage
  const [optionCustomValue, setOptionCustomValue] = useState<string>("");
  const optionCustomRef = useRef<typeof OptionCustom>(null);

  const handleOptionCustomChange = useCallback(() => {
    setOptionCustomValue((msg) => optionCustomRef.current?.value || "");
  }, [setOptionCustomValue]);

  useEffect(() => {
    const currentOptionCustom = optionCustomRef.current;
    currentOptionCustom?.addEventListener("change", handleOptionCustomChange);
    return () => {
      currentOptionCustom?.removeEventListener("change", handleOptionCustomChange);
    };
  }, [handleOptionCustomChange]);

  // RatingIndicator component usage
  const [ratingIndicatorValue, setRatingIndicatorValue] = useState<string>("");
  const ratingIndicatorRef = useRef<typeof RatingIndicator>(null);

  const handleRatingIndicatorChange = useCallback(() => {
    setRatingIndicatorValue((msg) => ratingIndicatorRef.current?.value || "");
  }, [setRatingIndicatorValue]);

  useEffect(() => {
    const currentRatingIndicator = ratingIndicatorRef.current;
    currentRatingIndicator?.addEventListener("change", handleRatingIndicatorChange);
    return () => {
      currentRatingIndicator?.removeEventListener("change", handleRatingIndicatorChange);
    };
  }, [handleRatingIndicatorChange]);

  // Slider component usage
  const [sliderValue, setSliderValue] = useState<string>("");
  const sliderRef = useRef<typeof Slider>(null);

  const handleSliderChange = useCallback(() => {
    setSliderValue((msg) => sliderRef.current?.value || "");
  }, [setSliderValue]);

  useEffect(() => {
    const currentSlider = sliderRef.current;
    currentSlider?.addEventListener("change", handleSliderChange);
    return () => {
      currentSlider?.removeEventListener("change", handleSliderChange);
    };
  }, [handleSliderChange]);

  // ProgressIndicator component usage
  const [progressIndicatorValue, setProgressIndicatorValue] = useState<string>("");
  const progressIndicatorRef = useRef<typeof ProgressIndicator>(null);

  const handleProgressIndicatorChange = useCallback(() => {
    setProgressIndicatorValue((msg) => progressIndicatorRef.current?.value || "");
  }, [setProgressIndicatorValue]);

  useEffect(() => {
    const currentProgressIndicator = progressIndicatorRef.current;
    currentProgressIndicator?.addEventListener("change", handleProgressIndicatorChange);
    return () => {
      currentProgressIndicator?.removeEventListener("change", handleProgressIndicatorChange);
    };
  }, [handleProgressIndicatorChange]);

  // StepInput component usage
  const [stepInputValue, setStepInputValue] = useState<string>("");
  const stepInputRef = useRef<typeof StepInput>(null);

  const handleStepInputChange = useCallback(() => {
    setStepInputValue((msg) => stepInputRef.current?.value || "");
  }, [setStepInputValue]);

  useEffect(() => {
    const currentStepInput = stepInputRef.current;
    currentStepInput?.addEventListener("change", handleStepInputChange);
    return () => {
      currentStepInput?.removeEventListener("change", handleStepInputChange);
    };
  }, [handleStepInputChange]);

  // DynamicDateRange component usage
  const [dynamicDateRangeValue, setDynamicDateRangeValue] = useState<string>("");
  const dynamicDateRangeRef = useRef<typeof DynamicDateRange>(null);

  const handleDynamicDateRangeChange = useCallback(() => {
    setDynamicDateRangeValue((msg) => dynamicDateRangeRef.current?.value || "");
  }, [setDynamicDateRangeValue]);

  useEffect(() => {
    const currentDynamicDateRange = dynamicDateRangeRef.current;
    currentDynamicDateRange?.addEventListener("change", handleDynamicDateRangeChange);
    return () => {
      currentDynamicDateRange?.removeEventListener("change", handleDynamicDateRangeChange);
    };
  }, [handleDynamicDateRangeChange]);

  
  return (
    <div className="app">
      <Input placeholder="Input" ref={inputRef} id="input-field"></Input>
      <TextArea placeholder="TextArea" ref={textAreaRef} id="textarea-field"></TextArea>
      <Search placeholder="Search" ref={searchRef} id="search-field"></Search>
      <ShellBarSearch placeholder="ShellBarSearch" ref={shellBarSearchRef} id="shellbarsearch-field"></ShellBarSearch>
      <ComboBox placeholder="ComboBox" ref={comboBoxRef} id="combobox-field"></ComboBox>
      <MultiComboBox placeholder="MultiComboBox" ref={multiComboBoxRef} id="multicombobox-field"></MultiComboBox> {/* FP */}
      <Select ref={selectRef} id="select-field"></Select> {/* FP */}
      <DatePicker placeholder="DatePicker" ref={datePickerRef} id="datepicker-field"></DatePicker>
      <DateRangePicker placeholder="DateRangePicker" ref={dateRangePickerRef} id="daterangepicker-field"></DateRangePicker>
      <DateTimePicker placeholder="DateTimePicker" ref={dateTimePickerRef} id="datetimepicker-field"></DateTimePicker>
      <TimePicker placeholder="TimePicker" ref={timePickerRef} id="timepicker-field"></TimePicker>
      <ColorPicker ref={colorPickerRef} id="colorpicker-field"></ColorPicker> {/* FP */}
      <ColorPaletteItem value="color" ref={colorPaletteItemRef} id="colorpaletteitem-field"></ColorPaletteItem> {/* FP */}
      <CalendarDate value="20250101" ref={calendarDateRef} id="calendardate-field"></CalendarDate> {/* FP - not a standalone component */}
      <FileUploader ref={fileUploaderRef} id="fileuploader-field"></FileUploader> {/* FP */}
      <CheckBox ref={checkBoxRef} id="checkbox-field"></CheckBox> {/* FP */}
      <RadioButton ref={radioButtonRef} id="radiobutton-field"></RadioButton> {/* FP */}
      <Switch ref={switchRef} id="switch-field"></Switch> {/* FP */}
      <Option value="option" ref={optionRef} id="option-field"></Option>
      <OptionCustom value="custom" ref={optionCustomRef} id="optioncustom-field"></OptionCustom>
      <RatingIndicator ref={ratingIndicatorRef} id="ratingindicator-field"></RatingIndicator> {/* FP - numeric */}
      <Slider ref={sliderRef} id="slider-field"></Slider> {/* FP - numeric */}
      <ProgressIndicator ref={progressIndicatorRef} id="progressindicator-field"></ProgressIndicator> {/* FP - numeric */}
      <StepInput ref={stepInputRef} id="stepinput-field"></StepInput> {/* FP - numeric */}
      <DynamicDateRange ref={dynamicDateRangeRef} id="dynamicdaterange-field"></DynamicDateRange> {/* FP - numeric */}

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
    </div>
  );
}

export default App;