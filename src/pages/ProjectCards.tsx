import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const ProjectCards = () => {
  const location = useLocation();
  const projects = location.state?.projects || [];
  const [modalProject, setModalProject] = useState<any | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Global Project Details</h1>
        {projects.length === 0 ? (
          <div className="text-center py-8">No projects found for the selected filters.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((project: any) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>
                    {project["Project Name"]}
                    {project["Voluntary Status"] && (
                      <Badge className="ml-2">{project["Voluntary Status"]}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {project["Voluntary Registry"]}
                    {project["Country"] && ` | ${project["Country"]}`}
                    {project["Region"] && ` | ${project["Region"]}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project["Project Description"] && (
                    <div className="mb-3 text-sm text-gray-600 line-clamp-3">
                      {project["Project Description"]}
                    </div>
                  )}
                  <div className="mb-2"><b>Area of Interest:</b> {project["Area of Interest"]}</div>
                  <div className="mb-2"><b>Methodology:</b> {project["Methodology"]}</div>
                  <div className="mb-2"><b>Total Credits Issued:</b> {project["Total Credits Issued"]}</div>
                  {project["Project Website"] && (
                    <div className="mb-2">
                      <b>Project Website:</b>{" "}
                      <a 
                        href={project["Project Website"]} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                  {project["Sustainability Certifications"] && (
                    <div className="mb-2"><b>Sustainability Certifications:</b> {project["Sustainability Certifications"]}</div>
                  )}
                  <div className="mb-2"><b>Project Registered:</b> {project["Project Registered"] ? new Date(project["Project Registered"]).toLocaleDateString() : "Date not Known"}</div>
                  <Button className="mt-2" onClick={() => setModalProject(project)}>
                    Read More Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Modal for full project details */}
        {modalProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4 md:p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-2 right-2 text-lg font-bold text-gray-500 hover:text-gray-800 z-10"
                onClick={() => setModalProject(null)}
              >
                ×
              </button>
              <h2 className="text-lg md:text-xl font-bold mb-4 pr-8">Full Project Details</h2>
              <div className="max-h-[60vh] overflow-y-auto">
                {Object.entries(modalProject)
                  .filter(([key]) => key !== 'id' && key !== 'created_at')
                  .map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <b>{key}:</b>{" "}
                    {typeof value === "string" && value.match(/^https?:\/\//) ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {value}
                      </a>
                    ) : (
                      String(value)
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCards; 