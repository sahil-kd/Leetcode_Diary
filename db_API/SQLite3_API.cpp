#include <iostream>
#include <string>
int main()
{
    int input;
    std::string str = "hello world";
    const std::string d = "";
    std::cout << "Hello world\n";
    std::cout << "Enter the input: ";
    std::cin >> input;
    std::cout << "\nOutput: " << input;
    int arr[2] = {12, 34};

    /*
    Hello this is a comment block
    */

    for (auto c : arr)
    {
        std::cout << c << ", ";
    }

    int b = 123; // #FF00FF
    return 0;
}