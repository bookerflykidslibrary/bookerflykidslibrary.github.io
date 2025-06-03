// Required: npm install @supabase/supabase-js axios react-select

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Select from 'react-select';

const supabase = createClient('https://sawufgyypmprtnuwvgnd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhd3VmZ3l5cG1wcnRudXd2Z25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzQxMjcsImV4cCI6MjA2NDQ1MDEyN30.NNDNTPMc-RlyPaAlENrRfJo632LNu96Vq3ylP4E7sF0');

export default function BookEntry() {
  const [isbn, setIsbn] = useState('');
  const [bookData, setBookData] = useState({});
  const [tags, setTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [copyNumber, setCopyNumber] = useState(1);

  useEffect(() => {
    fetchTagsAndLocations();
  }, []);

  const fetchTagsAndLocations = async () => {
    const { data: tagsData } = await supabase.from('tags').select();
    const { data: locationsData } = await supabase.from('locations').select();
    setTags(tagsData.map(tag => ({ label: tag.TagName, value: tag.id })));
    setLocations(locationsData.map(loc => ({ label: loc.LocationName, value: loc.id })));
  };

  const fetchBook = async () => {
    const { data: localBook } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single();
    if (localBook) {
      setBookData(localBook);
    } else {
      const res = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const book = res.data.items?.[0]?.volumeInfo;
      if (book) {
        const autoDesc = book.description || await generateDescription(book.title, book.categories);
        const { minAge, maxAge } = deriveAge(book.description || book.title);
        setBookData({
          BookID: generateBookID(),
          ISBN13: isbn,
          MinAge: minAge,
          MaxAge: maxAge,
          Title: book.title,
          Authors: book.authors?.join(', '),
          Description: autoDesc,
          Thumbnail: book.imageLinks?.thumbnail,
          Reviews: '',
        });
      }
    }
  };

  const deriveAge = (text) => {
    if (!text) return { minAge: 5, maxAge: 12 };
    const lower = text.toLowerCase();
    if (lower.includes('toddler')) return { minAge: 2, maxAge: 4 };
    if (lower.includes('teen')) return { minAge: 13, maxAge: 17 };
    if (lower.includes('young adult')) return { minAge: 12, maxAge: 18 };
    return { minAge: 6, maxAge: 12 };
  };

  const generateBookID = () => Math.floor(Math.random() * 100000);

  const generateDescription = async (title, categories) => {
    return `An engaging story titled '${title}' suitable for readers interested in ${categories?.join(', ') || 'various genres'}.`;
  };

  const handleConfirm = async () => {
    // Insert/Update catalog
    await supabase.from('catalog').upsert(bookData);

    // Calculate next copy number
    const { data: existingCopies } = await supabase
      .from('copyinfo')
      .select('CopyNumber')
      .eq('ISBN13', isbn)
      .eq('CopyLocation', selectedLocation.label);

    const nextCopyNumber = (existingCopies?.length || 0) + 1;

    await supabase.from('copyinfo').insert({
      CopyID: Math.floor(Math.random() * 100000),
      ISBN13: isbn,
      CopyNumber: nextCopyNumber,
      CopyLocation: selectedLocation.label,
    });

    alert('Book and copy added/updated successfully.');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto bg-white rounded-xl shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-center">Book Entry Form</h2>

      <input
        type="text"
        placeholder="Enter ISBN"
        value={isbn}
        onChange={(e) => setIsbn(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <button onClick={fetchBook} className="bg-blue-500 text-white px-4 py-2 rounded w-full">Fetch Book Info</button>

      {bookData?.Title && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <label className="font-semibold">BookID</label>
            <input type="text" value={bookData.BookID} onChange={(e) => setBookData({ ...bookData, BookID: e.target.value })} className="border p-2 rounded" />

            <label className="font-semibold">Title</label>
            <input type="text" value={bookData.Title} onChange={(e) => setBookData({ ...bookData, Title: e.target.value })} className="border p-2 rounded" />

            <label className="font-semibold">Authors</label>
            <input type="text" value={bookData.Authors} onChange={(e) => setBookData({ ...bookData, Authors: e.target.value })} className="border p-2 rounded" />

            <label className="font-semibold">Description</label>
            <textarea value={bookData.Description} rows={5} onChange={(e) => setBookData({ ...bookData, Description: e.target.value })} className="border p-2 rounded" />

            <label className="font-semibold">Min Age</label>
            <input type="number" value={bookData.MinAge} onChange={(e) => setBookData({ ...bookData, MinAge: +e.target.value })} className="border p-2 rounded" />

            <label className="font-semibold">Max Age</label>
            <input type="number" value={bookData.MaxAge} onChange={(e) => setBookData({ ...bookData, MaxAge: +e.target.value })} className="border p-2 rounded" />

            <label className="font-semibold">Reviews</label>
            <textarea value={bookData.Reviews} onChange={(e) => setBookData({ ...bookData, Reviews: e.target.value })} className="border p-2 rounded" />

            <label className="font-semibold">Tags</label>
            <Select isMulti options={tags} onChange={setSelectedTags} className="text-black" />

            <label className="font-semibold">Location</label>
            <Select options={locations} onChange={setSelectedLocation} className="text-black" />

            <label className="font-semibold">Thumbnail Preview</label>
            {bookData.Thumbnail && <img src={bookData.Thumbnail} alt="Thumbnail" className="w-40 h-auto rounded" />}
          </div>

          <button onClick={handleConfirm} className="bg-green-600 text-white px-4 py-2 rounded w-full">Confirm & Save</button>
        </div>
      )}
    </div>
  );
}
