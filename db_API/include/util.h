#pragma once
#include<iostream>
#include<string>
#include<vector>
#include<sstream>
#include<filesystem>
#include<Windows.h>

class util
{
public:
	// delay for (input) milliseconds | Great debug tool
	static void delay(int milliseconds) {
		std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));
	}
	static void input_int_vector(std::vector<int>& numbers) {
		std::string inp;
		std::getline(std::cin, inp);
		std::istringstream par(inp);
		int num;
		while (par >> num) {
			numbers.push_back(num);
		}
	}
	static void input_string_vector(std::vector<std::string>& numbers) {
		std::string inp;
		std::getline(std::cin, inp);
		std::istringstream par(inp);
		std::string num;
		while (par >> num) {
			numbers.push_back(num);
		}
	}
	static void trim_string(std::string& inputString) {
		if (inputString.empty()) return;

		const char* const delimiters = " \t\n\r";
		size_t start = inputString.find_first_not_of(delimiters);
		
		if (start == std::string::npos) {
			inputString.clear();
			return;
		}
		size_t end = inputString.find_last_not_of(delimiters);
		inputString = inputString.substr(start, end - start + 1);
	}
	static void remove_char_from_string(std::string str, char a) {
		str.erase(remove(str.begin(), str.end(), a), str.end());
	}
	static bool does_file_exist(const std::string& filename, const std::string& directory) {
		std::filesystem::path filePath = directory;
		filePath /= filename;
		return std::filesystem::exists(filePath);
	}

	enum color
	{
		BlackFore = 0,
		MaroonFore = FOREGROUND_RED,
		GreenFore = FOREGROUND_GREEN,
		NavyFore = FOREGROUND_BLUE,
		TealFore = FOREGROUND_GREEN | FOREGROUND_BLUE,
		OliveFore = FOREGROUND_RED | FOREGROUND_GREEN,
		PurpleFore = FOREGROUND_RED | FOREGROUND_BLUE,
		GrayFore = FOREGROUND_RED | FOREGROUND_GREEN | FOREGROUND_BLUE,
		SilverFore = FOREGROUND_INTENSITY,
		RedFore = FOREGROUND_INTENSITY | FOREGROUND_RED,
		LimeFore = FOREGROUND_INTENSITY | FOREGROUND_GREEN,
		BlueFore = FOREGROUND_INTENSITY | FOREGROUND_BLUE,
		AquaFore = FOREGROUND_INTENSITY | FOREGROUND_GREEN | FOREGROUND_BLUE,
		YellowFore = FOREGROUND_INTENSITY | FOREGROUND_RED | FOREGROUND_GREEN,
		FuchsiaFore = FOREGROUND_INTENSITY | FOREGROUND_RED | FOREGROUND_BLUE,
		WhiteFore = FOREGROUND_INTENSITY | FOREGROUND_RED | FOREGROUND_GREEN | FOREGROUND_BLUE,

		BlackBack = 0,
		MaroonBack = BACKGROUND_RED,
		GreenBack = BACKGROUND_GREEN,
		NavyBack = BACKGROUND_BLUE,
		TealBack = BACKGROUND_GREEN | BACKGROUND_BLUE,
		OliveBack = BACKGROUND_RED | BACKGROUND_GREEN,
		PurpleBack = BACKGROUND_RED | BACKGROUND_BLUE,
		GrayBack = BACKGROUND_RED | BACKGROUND_GREEN | BACKGROUND_BLUE,
		SilverBack = BACKGROUND_INTENSITY,
		RedBack = BACKGROUND_INTENSITY | BACKGROUND_RED,
		LimeBack = BACKGROUND_INTENSITY | BACKGROUND_GREEN,
		BlueBack = BACKGROUND_INTENSITY | BACKGROUND_BLUE,
		AquaBack = BACKGROUND_INTENSITY | BACKGROUND_GREEN | BACKGROUND_BLUE,
		YellowBack = BACKGROUND_INTENSITY | BACKGROUND_RED | BACKGROUND_GREEN,
		FuchsiaBack = BACKGROUND_INTENSITY | BACKGROUND_RED | BACKGROUND_BLUE,
		WhiteBack = BACKGROUND_INTENSITY | BACKGROUND_RED | BACKGROUND_GREEN | BACKGROUND_BLUE,
	};
};
