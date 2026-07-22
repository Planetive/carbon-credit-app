import React from "react";

interface ProcessingProductTypeSelectorProps {
  isAnimating: boolean;
  onSelectIntermediate: () => void;
  onSelectFinal: () => void;
}

export const ProcessingProductTypeSelector: React.FC<ProcessingProductTypeSelectorProps> = ({
  isAnimating,
  onSelectIntermediate,
  onSelectFinal,
}) => {
  return (
    <div
      className={`space-y-6 transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
    >
      <div className="text-center py-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Downstream Emissions</h3>
        <p className="text-gray-600 mb-8">Select your product type to continue</p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={onSelectIntermediate}
            className="group relative p-8 rounded-xl border-2 border-gray-200 hover:border-[#1D9E75] bg-white hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🏭</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Intermediate Product</h4>
              <p className="text-sm text-gray-600">Processing of Sold Products</p>
              <p className="text-xs text-gray-500 mt-2">Products that require further processing</p>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectFinal}
            className="group relative p-8 rounded-xl border-2 border-gray-200 hover:border-[#1D9E75] bg-white hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📦</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Final Product</h4>
              <p className="text-sm text-gray-600">Use of Sold Products</p>
              <p className="text-xs text-gray-500 mt-2">Products ready for end-user consumption</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
