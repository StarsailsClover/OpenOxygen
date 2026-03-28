{
  "targets": [
    {
      "target_name": "openoxygen_native",
      "sources": [
        "cpp/core/core.cpp",
        "cpp/input/input_controller.cpp",
        "binding.cpp"
      ],
      "include_dirs": [
        "include",
        "<!(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NAPI_VERSION=8"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "-luser32.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }]
      ]
    }
  ]
}
