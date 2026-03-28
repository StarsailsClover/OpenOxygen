#ifndef OXYGEN_CORE_H
#define OXYGEN_CORE_H

#include <windows.h>
#include <node_api.h>
#include <string>

namespace Oxygen {

constexpr const char* VERSION = "26w15aE";

class PerformanceMonitor {
public:
    static void Record(const std::string& operation, double durationMs);
};

bool Initialize();
void Shutdown();

} // namespace Oxygen

#endif
