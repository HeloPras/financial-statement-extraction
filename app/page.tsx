  
import DropZone from "../component/Bits/dropzone"

const page = () => {

  const handleFilesDrop = (files: File[]): void => {
    console.log(files)
  }

  return (
    <>
      <DropZone />
    </>
  )
}

export default page
