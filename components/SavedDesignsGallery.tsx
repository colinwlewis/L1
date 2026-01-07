import React, { useState, useMemo } from 'react';
import { SavedDesign } from '../types';
import { Button } from './Button';

interface SavedDesignsGalleryProps {
  designs: SavedDesign[];
  onLoad: (design: SavedDesign) => void;
  onEdit: (design: SavedDesign) => void;
  onDelete: (id: string) => void;
}

export const SavedDesignsGallery: React.FC<SavedDesignsGalleryProps> = ({ designs, onLoad, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredDesigns = useMemo(() => {
    return designs.filter(design => {
      const matchesSearch = design.prompt.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateFilter) {
        const designDate = new Date(design.timestamp);
        // Compare YYYY-MM-DD
        const designDateStr = designDate.getFullYear() + '-' + 
                             String(designDate.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(designDate.getDate()).padStart(2, '0');
        matchesDate = designDateStr === dateFilter;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [designs, searchTerm, dateFilter]);

  return (
    <div id="saved-designs-gallery" className="mt-16 border-t border-gray-200 pt-10 mb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Saved Projects</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredDesigns.length} {filteredDesigns.length === 1 ? 'project' : 'projects'} found
            {designs.length !== filteredDesigns.length && ` (filtered from ${designs.length})`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Filter by keywords..."
              className="pl-10 block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm border p-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <input
            type="date"
            className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm border p-2 text-gray-500"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          
          {(searchTerm || dateFilter) && (
            <button
              onClick={() => { setSearchTerm(''); setDateFilter(''); }}
              className="text-sm text-gray-500 hover:text-red-500 font-medium px-2 py-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      {filteredDesigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
           <div className="mx-auto h-12 w-12 text-gray-300 bg-gray-50 rounded-full flex items-center justify-center mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
             </svg>
           </div>
           <h3 className="text-sm font-medium text-gray-900">No projects found</h3>
           <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
             {designs.length === 0 
               ? "Upload a photo and generate a landscape vision to start building your portfolio."
               : "Try adjusting your search filters to find what you're looking for."}
           </p>
           {(searchTerm || dateFilter) && (
             <Button 
               variant="outline" 
               className="mt-4"
               onClick={() => { setSearchTerm(''); setDateFilter(''); }}
             >
               Clear Filters
             </Button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((design) => (
            <div key={design.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col">
              {/* Main Image Area - Result */}
              <div className="relative h-48 bg-gray-100 group cursor-pointer" onClick={() => onLoad(design)}>
                <img 
                  src={design.generatedImage} 
                  alt="Project Result" 
                  className="w-full h-full object-cover"
                />
                
                {design.iterations && design.iterations.length > 1 && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm z-10">
                    {design.iterations.length} Stages
                  </div>
                )}
                
                <div className="absolute top-2 right-2 bg-leaf-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                  Vision
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                   <span className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-1 rounded-full text-sm font-medium text-gray-800 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                     View Result
                   </span>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-grow">
                {/* Info Row: Thumbnail + Details */}
                <div className="flex gap-3 mb-3">
                    <div className="flex-shrink-0 relative group/thumb cursor-help" title="Original Image">
                         <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            <img src={design.originalImage} className="w-full h-full object-cover" alt="Original" />
                         </div>
                         <div className="absolute -bottom-1 -right-1 bg-gray-600 text-white text-[9px] px-1 rounded border border-white shadow-sm">
                           Before
                         </div>
                    </div>
                    
                    <div className="flex flex-col flex-grow min-w-0">
                         <p className="text-xs text-gray-500 font-medium mb-0.5">{formatDate(design.timestamp)}</p>
                         <p className="text-sm text-gray-800 line-clamp-2 leading-snug" title={design.prompt}>
                           "{design.prompt}"
                         </p>
                    </div>
                </div>

                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-xs py-1.5 px-1"
                    onClick={() => onLoad(design)}
                    title="View"
                  >
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs py-1.5 px-1"
                    onClick={() => onEdit(design)}
                    title="Edit"
                  >
                    Edit
                  </Button>
                  <button 
                    onClick={() => onDelete(design.id)}
                    className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex-shrink-0"
                    title="Delete project"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};